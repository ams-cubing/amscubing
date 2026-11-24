"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@workspace/db";
import {
  formatDelegatesLabel,
  resolveCompetitionScale,
  resolveOrganizerExperienceLevel,
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
import {
  getMexicoOrganizerCountsLastTwoYears,
  organizerExperienceWindow,
} from "@/lib/wca-organizer-counts";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";
import {
  BOARDS_TOOLS_DENIED_MESSAGE,
  boardsToolsBetaDenial,
  sessionHasBoardsToolsBeta,
} from "../_lib/boards-tools-beta";
import { isCompetitionDetailsCard } from "../_lib/competition-details-card";

export type CompetitionOrganizerExperience = {
  name: string;
  wcaId: string | null;
  isPrimary: boolean;
  /** Ended MX WCA comps organized in the last two years; null if no WCA ID. */
  organizedCountLastTwoYears: number | null;
};

export type OrganizerExperienceSummary = {
  windowStart: string;
  windowEnd: string;
  requiredCount: number;
  /** Primary organizer count if available, else max among organizers with WCA ID. */
  assessedCount: number | null;
  assessedOrganizerName: string | null;
  experienceLevel: string | null;
  experienceIndex: number | null;
  meetsRequirement: boolean | null;
  countsAvailable: boolean;
};

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
  organizers: CompetitionOrganizerExperience[];
  organizerExperience: OrganizerExperienceSummary;
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
  const [row, counts, scaleConfig] = await Promise.all([
    db.query.competitions.findFirst({
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
        organizers: {
          with: {
            organizer: {
              columns: { name: true, wcaId: true },
            },
          },
        },
      },
    }),
    getMexicoOrganizerCountsLastTwoYears(),
    getCompetitionScaleTiers(db),
  ]);
  if (!row) return null;

  const eventsPlan = Array.isArray(row.eventsPlan) ? row.eventsPlan : [];
  const eventIds = eventsPlan.map((event) => event.eventId);
  const scramblers = recommendedScramblers({
    capacity: row.capacity,
    eventIds,
  });
  const { tiers } = scaleConfig;
  const scale = resolveCompetitionScale({
    capacity: row.capacity,
    stationCount: row.stationCount,
    tiers,
  });

  const countsAvailable = counts.ok;
  const organizers: CompetitionOrganizerExperience[] = row.organizers.map(
    (entry) => {
      const wcaId = entry.organizer.wcaId?.trim().toUpperCase() || null;
      return {
        name: entry.organizer.name,
        wcaId,
        isPrimary: entry.isPrimary,
        organizedCountLastTwoYears:
          wcaId && countsAvailable ? (counts.counts[wcaId] ?? 0) : null,
      };
    },
  );

  const withCounts = organizers.filter(
    (organizer) => organizer.organizedCountLastTwoYears != null,
  );
  const primaryWithCount = withCounts.find((organizer) => organizer.isPrimary);
  const assessed =
    primaryWithCount ??
    withCounts
      .slice()
      .sort(
        (a, b) =>
          (b.organizedCountLastTwoYears ?? 0) -
          (a.organizedCountLastTwoYears ?? 0),
      )[0] ??
    null;

  const assessedCount = assessed?.organizedCountLastTwoYears ?? null;
  const experience =
    assessedCount == null
      ? null
      : resolveOrganizerExperienceLevel({
          organizedCount: assessedCount,
          tiers,
        });
  const window = organizerExperienceWindow();

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
    organizers,
    organizerExperience: {
      windowStart: window.start,
      windowEnd: window.end,
      requiredCount: scale.minOrganizerCompetitions,
      assessedCount,
      assessedOrganizerName: assessed?.name ?? null,
      experienceLevel: experience?.tier.labelEs ?? null,
      experienceIndex: experience?.index ?? null,
      meetsRequirement:
        assessedCount == null
          ? null
          : assessedCount >= scale.minOrganizerCompetitions,
      countsAvailable,
    },
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
  if (!(await sessionHasBoardsToolsBeta(session.user))) {
    return { ok: false, message: BOARDS_TOOLS_DENIED_MESSAGE };
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
    const betaDenied = await boardsToolsBetaDenial(actor);
    if (betaDenied) {
      return { ok: false, message: betaDenied };
    }
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
