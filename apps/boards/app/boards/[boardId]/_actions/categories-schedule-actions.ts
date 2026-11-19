"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@workspace/db";
import {
  serializeScaleTiers,
  type AmsCompetitionTierStored,
} from "@workspace/db/ams-competition-scale";
import { getCompetitionScaleTiers } from "@workspace/db/ams-competition-scale-store";
import {
  CompetitionFormatError,
  listWcaEvents,
  recommendedScramblers,
  recommendedStaffMinimum,
  saveCompetitionFormat,
  type CompetitionEventPlanItem,
  type CompetitionFormat,
  type WcaEvent,
} from "@workspace/db/competition-format";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { boards, competitions } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

import { canAccessBoard } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";
import {
  isCategoriesCard,
  isScheduleCard,
} from "../_lib/categories-schedule-card";

export type CategoriesScheduleData = {
  format: CompetitionFormat;
  capacity: number;
  events: readonly WcaEvent[];
  tiers: AmsCompetitionTierStored[];
  recommendations: {
    staffMinimum: number | null;
    scramblers: number;
    demoEventIds: string[];
  };
};

export type CategoriesScheduleResult =
  | { ok: true; data: CategoriesScheduleData | null }
  | { ok: false; message: string };

export type CategoriesScheduleMutationResult =
  | { ok: true; message: string; data: CategoriesScheduleData }
  | { ok: false; message: string };

async function formatCardCompetition(
  boardId: number,
  cardId: number,
  mode: "categories" | "schedule" | "either",
) {
  const card = await assertCardOnBoard(boardId, cardId);
  const allowed =
    mode === "categories"
      ? isCategoriesCard(card.title)
      : mode === "schedule"
        ? isScheduleCard(card.title)
        : isCategoriesCard(card.title) || isScheduleCard(card.title);
  if (!allowed) {
    throw new Error(
      mode === "schedule"
        ? "Esta tarjeta no maneja el horario"
        : "Esta tarjeta no maneja categorías",
    );
  }
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  return board?.competitionId ?? null;
}

function recommendationsFor(
  format: CompetitionFormat,
  capacity: number,
): CategoriesScheduleData["recommendations"] {
  const eventIds = format.eventsPlan.map((event) => event.eventId);
  const scramblers = recommendedScramblers({ capacity, eventIds });
  return {
    staffMinimum:
      format.stationCount == null
        ? null
        : recommendedStaffMinimum({
            stationCount: format.stationCount,
            zoneCount: format.zoneCount,
          }),
    scramblers: scramblers.count,
    demoEventIds: scramblers.demoEventIds,
  };
}

async function loadData(
  competitionId: number,
): Promise<CategoriesScheduleData | null> {
  const row = await db.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: {
      capacity: true,
      stationCount: true,
      zoneCount: true,
      eventsPlan: true,
    },
  });
  if (!row) return null;

  const format: CompetitionFormat = {
    stationCount: row.stationCount,
    zoneCount: row.zoneCount,
    eventsPlan: Array.isArray(row.eventsPlan) ? row.eventsPlan : [],
  };
  const { tiers } = await getCompetitionScaleTiers(db);

  return {
    format,
    capacity: row.capacity,
    events: listWcaEvents(),
    tiers: serializeScaleTiers(tiers),
    recommendations: recommendationsFor(format, row.capacity),
  };
}

/** Read-only: also works on archived boards. */
export async function loadCategoriesScheduleCard(input: {
  boardId: number;
  cardId: number;
}): Promise<CategoriesScheduleResult> {
  const session = await requireSessionOrUnauthorized();
  if (!(await canAccessBoard(session.user, input.boardId))) {
    return { ok: false, message: "No tienes acceso a este tablero" };
  }
  const competitionId = await formatCardCompetition(
    input.boardId,
    input.cardId,
    "either",
  );
  if (!competitionId) return { ok: true, data: null };
  return { ok: true, data: await loadData(competitionId) };
}

const eventPlanSchema = z.object({
  eventId: z.string().min(1).max(16),
  expectedCompetitors: z.number().int().min(0).max(5000),
  rounds: z.number().int().min(1).max(4),
  cutoffCs: z.number().int().min(0).max(3_600_000).nullable(),
  timeLimitCs: z.number().int().min(0).max(3_600_000).nullable(),
});

const saveSchema = z.object({
  boardId: z.number().int().positive(),
  cardId: z.number().int().positive(),
  stationCount: z.number().int().min(1).max(200).nullable(),
  zoneCount: z.number().int().min(1).max(20),
  eventsPlan: z.array(eventPlanSchema).max(listWcaEvents().length),
});

export async function saveCategoriesScheduleFromCard(input: {
  boardId: number;
  cardId: number;
  stationCount: number | null;
  zoneCount: number;
  eventsPlan: CompetitionEventPlanItem[];
}): Promise<CategoriesScheduleMutationResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Datos de formato inválidos" };
  }

  try {
    const actor = await requireBoardAccess(parsed.data.boardId);
    const competitionId = await formatCardCompetition(
      parsed.data.boardId,
      parsed.data.cardId,
      "categories",
    );
    if (!competitionId) {
      return {
        ok: false,
        message: "Este tablero no está ligado a una competencia",
      };
    }

    const { allowed } = await consumeRateLimit({
      key: `boards:categories-schedule:user:${actor.id}`,
      windowMs: 10 * 60 * 1000,
      max: 60,
    });
    if (!allowed) {
      return {
        ok: false,
        message: "Demasiados cambios; espera un momento e inténtalo de nuevo",
      };
    }

    await saveCompetitionFormat(db, competitionId, {
      stationCount: parsed.data.stationCount,
      zoneCount: parsed.data.zoneCount,
      eventsPlan: parsed.data.eventsPlan,
    });

    const data = await loadData(competitionId);
    if (!data) {
      return { ok: false, message: "No se pudo recargar el formato" };
    }

    revalidatePath(`/boards/${parsed.data.boardId}`);
    log.info("boards.categories_schedule.saved", {
      boardId: parsed.data.boardId,
      competitionId,
      eventCount: parsed.data.eventsPlan.length,
      stationCount: parsed.data.stationCount,
      zoneCount: parsed.data.zoneCount,
      userId: actor.id,
    });

    return { ok: true, message: "Formato guardado", data };
  } catch (error) {
    if (error instanceof CompetitionFormatError) {
      return { ok: false, message: error.message };
    }
    log.error("boards.categories_schedule.save_failed", {
      boardId: input.boardId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "No se pudo guardar el formato" };
  }
}
