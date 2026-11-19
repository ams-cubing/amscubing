"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@workspace/db";
import {
  formatDelegatesLabel,
  resolveCompetitionScale,
  serializeScaleTiers,
  type AmsCompetitionTierStored,
  type CompetitionScale,
} from "@workspace/db/ams-competition-scale";
import { getCompetitionScaleTiers } from "@workspace/db/ams-competition-scale-store";
import {
  isWcaEventId,
  listWcaEvents,
  recommendedScramblers,
  recommendedStaffMinimum,
  type WcaEvent,
} from "@workspace/db/competition-format-rules";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { boards, competitions } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

import { canAccessBoard } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";
import { isCompetitionDetailsCard } from "../_lib/competition-details-card";

export type CompetitionDetailsData = {
  name: string | null;
  nameReason: string | null;
  city: string;
  stateName: string | null;
  startDate: string;
  endDate: string;
  capacity: number;
  stationCount: number | null;
  zoneCount: number;
  mainEventId: string | null;
  eventCount: number;
  events: readonly WcaEvent[];
  tiers: AmsCompetitionTierStored[];
  scale: CompetitionScale;
  delegatesLabel: string;
  recommendations: {
    staffMinimum: number | null;
    scramblers: number;
    demoEventIds: string[];
  };
};

export type CompetitionDetailsResult =
  | { ok: true; data: CompetitionDetailsData | null }
  | { ok: false; message: string };

export type CompetitionDetailsMutationResult =
  | { ok: true; message: string; data: CompetitionDetailsData }
  | { ok: false; message: string };

async function detailsCardCompetition(boardId: number, cardId: number) {
  const card = await assertCardOnBoard(boardId, cardId);
  if (!isCompetitionDetailsCard(card.title)) {
    throw new Error("Esta tarjeta no maneja los detalles de competencia");
  }
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  return board?.competitionId ?? null;
}

async function loadData(
  competitionId: number,
): Promise<CompetitionDetailsData | null> {
  const row = await db.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: {
      name: true,
      nameReason: true,
      city: true,
      startDate: true,
      endDate: true,
      capacity: true,
      stationCount: true,
      zoneCount: true,
      mainEventId: true,
      eventsPlan: true,
    },
    with: {
      state: { columns: { name: true } },
    },
  });
  if (!row) return null;

  const eventsPlan = Array.isArray(row.eventsPlan) ? row.eventsPlan : [];
  const eventIds = eventsPlan.map((event) => event.eventId);
  const scramblers = recommendedScramblers({
    capacity: row.capacity,
    eventIds,
  });
  const { tiers } = await getCompetitionScaleTiers(db);
  const scale = resolveCompetitionScale({
    capacity: row.capacity,
    stationCount: row.stationCount,
    tiers,
  });

  return {
    name: row.name,
    nameReason: row.nameReason,
    city: row.city,
    stateName: row.state?.name ?? null,
    startDate: row.startDate,
    endDate: row.endDate,
    capacity: row.capacity,
    stationCount: row.stationCount,
    zoneCount: row.zoneCount,
    mainEventId: row.mainEventId,
    eventCount: eventsPlan.length,
    events: listWcaEvents(),
    tiers: serializeScaleTiers(tiers),
    scale,
    delegatesLabel: formatDelegatesLabel(scale),
    recommendations: {
      staffMinimum:
        row.stationCount == null
          ? null
          : recommendedStaffMinimum({
              stationCount: row.stationCount,
              zoneCount: row.zoneCount,
            }),
      scramblers: scramblers.count,
      demoEventIds: scramblers.demoEventIds,
    },
  };
}

export async function loadCompetitionDetailsCard(input: {
  boardId: number;
  cardId: number;
}): Promise<CompetitionDetailsResult> {
  const session = await requireSessionOrUnauthorized();
  if (!(await canAccessBoard(session.user, input.boardId))) {
    return { ok: false, message: "No tienes acceso a este tablero" };
  }
  const competitionId = await detailsCardCompetition(
    input.boardId,
    input.cardId,
  );
  if (!competitionId) return { ok: true, data: null };
  return { ok: true, data: await loadData(competitionId) };
}

const saveSchema = z.object({
  boardId: z.number().int().positive(),
  cardId: z.number().int().positive(),
  name: z.string().trim().max(200),
  nameReason: z.string().trim().max(2000),
  capacity: z.number().int().min(1).max(5000),
  stationCount: z.number().int().min(1).max(200).nullable(),
  mainEventId: z.string().trim().max(16).nullable(),
});

export async function saveCompetitionDetailsFromCard(input: {
  boardId: number;
  cardId: number;
  name: string;
  nameReason: string;
  capacity: number;
  stationCount: number | null;
  mainEventId: string | null;
}): Promise<CompetitionDetailsMutationResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Datos de detalles inválidos" };
  }

  try {
    const actor = await requireBoardAccess(parsed.data.boardId);
    const competitionId = await detailsCardCompetition(
      parsed.data.boardId,
      parsed.data.cardId,
    );
    if (!competitionId) {
      return {
        ok: false,
        message: "Este tablero no está ligado a una competencia",
      };
    }

    const { allowed } = await consumeRateLimit({
      key: `boards:competition-details:user:${actor.id}`,
      windowMs: 10 * 60 * 1000,
      max: 60,
    });
    if (!allowed) {
      return {
        ok: false,
        message: "Demasiados cambios; espera un momento e inténtalo de nuevo",
      };
    }

    const mainEventId = parsed.data.mainEventId?.trim() || null;
    if (mainEventId && !isWcaEventId(mainEventId)) {
      return { ok: false, message: "Evento principal no válido" };
    }

    const name = parsed.data.name.trim() || null;
    const nameReason = parsed.data.nameReason.trim() || null;

    await db
      .update(competitions)
      .set({
        name,
        nameReason,
        capacity: parsed.data.capacity,
        stationCount: parsed.data.stationCount,
        mainEventId,
        updatedAt: new Date(),
      })
      .where(eq(competitions.id, competitionId));

    const data = await loadData(competitionId);
    if (!data) {
      return { ok: false, message: "No se pudieron recargar los detalles" };
    }

    revalidatePath(`/boards/${parsed.data.boardId}`);
    log.info("boards.competition_details.saved", {
      boardId: parsed.data.boardId,
      competitionId,
      capacity: parsed.data.capacity,
      stationCount: parsed.data.stationCount,
      userId: actor.id,
    });

    return { ok: true, message: "Detalles guardados", data };
  } catch (error) {
    log.error("boards.competition_details.save_failed", {
      boardId: input.boardId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "No se pudieron guardar los detalles" };
  }
}
