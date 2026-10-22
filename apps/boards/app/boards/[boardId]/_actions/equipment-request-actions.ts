"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/db";
import { EQUIPMENT_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import {
  EquipmentError,
  getCompetitionEquipmentSheet,
  listRequestableEquipmentTypes,
  saveEquipmentRequest,
  type CompetitionEquipmentSheet,
  type RequestableEquipmentType,
} from "@workspace/db/equipment";
import {
  competitionDelegatesOnly,
  equipmentRequestNotificationRow,
  insertNotifications,
} from "@workspace/db/notifications";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { boards } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

import { canAccessBoard } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { getCalendarUrl } from "@/lib/urls";
import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";

export type EquipmentCardData = {
  sheet: CompetitionEquipmentSheet;
  /** Availability counts only equipment held by the competition's delegates. */
  types: RequestableEquipmentType[];
  hasDelegates: boolean;
};

export type EquipmentCardResult =
  | { ok: true; data: EquipmentCardData | null }
  | { ok: false; message: string };

export type SaveEquipmentRequestResult =
  | { ok: true; message: string; data: EquipmentCardData | null }
  | { ok: false; message: string };

async function equipmentCardCompetition(boardId: number, cardId: number) {
  const card = await assertCardOnBoard(boardId, cardId);
  if (card.title.trim() !== EQUIPMENT_CARD_TITLE) {
    throw new Error("Esta tarjeta no maneja equipo");
  }
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  return board?.competitionId ?? null;
}

async function loadCardData(
  competitionId: number,
): Promise<EquipmentCardData | null> {
  const [sheet, delegates] = await Promise.all([
    getCompetitionEquipmentSheet(db, competitionId),
    competitionDelegatesOnly(db, competitionId),
  ]);
  if (!sheet) return null;
  const types = await listRequestableEquipmentTypes(db, {
    guardianUserIds: delegates.map((delegate) => delegate.id),
  });
  return { sheet, types, hasDelegates: delegates.length > 0 };
}

/** Read-only: also works on archived boards. */
export async function loadEquipmentCard(input: {
  boardId: number;
  cardId: number;
}): Promise<EquipmentCardResult> {
  const session = await requireSessionOrUnauthorized();
  if (!(await canAccessBoard(session.user, input.boardId))) {
    return { ok: false, message: "No tienes acceso a este tablero" };
  }
  const competitionId = await equipmentCardCompetition(
    input.boardId,
    input.cardId,
  );
  if (!competitionId) return { ok: true, data: null };
  return { ok: true, data: await loadCardData(competitionId) };
}

const saveSchema = z.object({
  boardId: z.number().int().positive(),
  cardId: z.number().int().positive(),
  lines: z
    .array(
      z.object({
        typeId: z.number().int().positive(),
        quantity: z.number().int().min(0).max(999),
      }),
    )
    .max(100),
  notes: z.string().max(2000),
  submit: z.boolean(),
});

export async function saveEquipmentRequestFromCard(
  raw: z.input<typeof saveSchema>,
): Promise<SaveEquipmentRequestResult> {
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa las cantidades de la solicitud" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  const competitionId = await equipmentCardCompetition(
    input.boardId,
    input.cardId,
  );
  if (!competitionId) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  const { allowed } = await consumeRateLimit({
    key: `boards:equipment-request:user:${actor.id}`,
    windowMs: 10 * 60 * 1000,
    max: 30,
  });
  if (!allowed) {
    return {
      ok: false,
      message: "Espera unos minutos antes de volver a guardar la solicitud",
    };
  }

  const delegates = await competitionDelegatesOnly(db, competitionId);
  const available = new Map(
    (
      await listRequestableEquipmentTypes(db, {
        guardianUserIds: delegates.map((delegate) => delegate.id),
      })
    ).map((type) => [type.id, type]),
  );
  for (const line of input.lines) {
    const type = available.get(line.typeId);
    if (line.quantity > (type?.available ?? 0)) {
      return {
        ok: false,
        message: type?.obsolete
          ? `${type.name} es obsoleto; quítalo de la solicitud`
          : `Solo hay ${type?.available ?? 0} ${type?.name ?? "equipo"} disponibles con los delegados`,
      };
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const saved = await saveEquipmentRequest(tx, {
        actorId: actor.id,
        competitionId,
        lines: input.lines,
        notes: input.notes,
        submit: input.submit,
      });
      if (input.submit) {
        const [delegates, competition] = await Promise.all([
          competitionDelegatesOnly(tx, competitionId),
          tx.query.competitions.findFirst({
            where: (c, { eq: eqc }) => eqc(c.id, competitionId),
            columns: { city: true, name: true },
          }),
        ]);
        await insertNotifications(
          tx,
          delegates.map((delegate) =>
            equipmentRequestNotificationRow({
              recipient: delegate,
              actorId: actor.id,
              calendarUrl: getCalendarUrl(),
              competitionId,
              requestId: saved.requestId,
              city: competition?.name?.trim() || competition?.city || "",
            }),
          ),
        );
      }
      return saved;
    });

    log.info("boards.equipment_request.saved", {
      boardId: input.boardId,
      competitionId,
      requestId: result.requestId,
      status: result.status,
      actorId: actor.id,
    });

    return {
      ok: true,
      message: input.submit
        ? "Solicitud enviada al delegado"
        : "Solicitud guardada",
      data: await loadCardData(competitionId),
    };
  } catch (error) {
    if (error instanceof EquipmentError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
