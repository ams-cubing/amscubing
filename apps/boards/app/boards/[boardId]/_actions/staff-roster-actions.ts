"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/db";
import {
  addCompetitionStaff,
  CompetitionStaffError,
  listCompetitionStaff,
  removeCompetitionStaff,
  updateCompetitionStaff,
  type CompetitionStaffEntry,
} from "@workspace/db/competition-staff";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { boards } from "@workspace/db/schema";
import { STAFF_ACTIVITIES } from "@workspace/db/staff-labels";
import { log } from "@workspace/server/log";

import { canAccessBoard } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { getCoursesUrl } from "@/lib/urls";
import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";
import { staffCardMode } from "../_lib/staff-cards";

export type StaffRosterData = {
  course: { title: string; url: string } | null;
  members: CompetitionStaffEntry[];
};

export type StaffRosterResult =
  | { ok: true; data: StaffRosterData | null }
  | { ok: false; message: string };

export type StaffRosterMutationResult =
  | { ok: true; message: string; data: StaffRosterData }
  | { ok: false; message: string };

async function staffCardCompetition(boardId: number, cardId: number) {
  const card = await assertCardOnBoard(boardId, cardId);
  if (!staffCardMode(card.title)) {
    throw new Error("Esta tarjeta no maneja la lista de staff");
  }
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  return board?.competitionId ?? null;
}

async function loadRoster(competitionId: number): Promise<StaffRosterData> {
  const { course, members } = await listCompetitionStaff(db, competitionId);
  return {
    course: course
      ? {
          title: course.title,
          url: `${getCoursesUrl()}/cursos/${encodeURIComponent(course.slug)}`,
        }
      : null,
    members,
  };
}

/** Read-only: also works on archived boards. */
export async function loadStaffRosterCard(input: {
  boardId: number;
  cardId: number;
}): Promise<StaffRosterResult> {
  const session = await requireSessionOrUnauthorized();
  if (!(await canAccessBoard(session.user, input.boardId))) {
    return { ok: false, message: "No tienes acceso a este tablero" };
  }
  const competitionId = await staffCardCompetition(input.boardId, input.cardId);
  if (!competitionId) return { ok: true, data: null };
  return { ok: true, data: await loadRoster(competitionId) };
}

const cardSchema = z.object({
  boardId: z.number().int().positive(),
  cardId: z.number().int().positive(),
});

const saveSchema = cardSchema.extend({
  memberId: z.number().int().positive().optional(),
  name: z.string().max(200),
  wcaId: z.string().max(20).optional(),
  email: z.string().max(254).optional(),
  activities: z.array(z.enum(STAFF_ACTIVITIES)).max(STAFF_ACTIVITIES.length),
});

const removeSchema = cardSchema.extend({
  memberId: z.number().int().positive(),
});

async function prepareMutation(boardId: number, cardId: number) {
  const actor = await requireBoardAccess(boardId);
  const competitionId = await staffCardCompetition(boardId, cardId);
  if (!competitionId) {
    return {
      ok: false as const,
      message: "Este tablero no está ligado a una competencia",
    };
  }
  const { allowed } = await consumeRateLimit({
    key: `boards:staff-roster:user:${actor.id}`,
    windowMs: 10 * 60 * 1000,
    max: 120,
  });
  if (!allowed) {
    return {
      ok: false as const,
      message: "Espera unos minutos antes de seguir editando la lista de staff",
    };
  }
  return { ok: true as const, actor, competitionId };
}

export async function saveStaffMemberFromCard(
  raw: z.input<typeof saveSchema>,
): Promise<StaffRosterMutationResult> {
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos de la persona" };
  }
  const input = parsed.data;
  const prepared = await prepareMutation(input.boardId, input.cardId);
  if (!prepared.ok) return prepared;
  const { actor, competitionId } = prepared;

  const member = {
    name: input.name,
    wcaId: input.wcaId,
    email: input.email,
    activities: input.activities,
  };
  try {
    if (input.memberId) {
      await updateCompetitionStaff(db, {
        competitionId,
        memberId: input.memberId,
        member,
      });
    } else {
      await addCompetitionStaff(db, {
        competitionId,
        actorId: actor.id,
        member,
      });
    }
  } catch (error) {
    if (error instanceof CompetitionStaffError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  log.info(
    input.memberId
      ? "boards.staff_roster.updated"
      : "boards.staff_roster.added",
    {
      boardId: input.boardId,
      competitionId,
      memberId: input.memberId,
      actorId: actor.id,
    },
  );

  return {
    ok: true,
    message: input.memberId ? "Datos actualizados" : "Agregado a la lista",
    data: await loadRoster(competitionId),
  };
}

export async function removeStaffMemberFromCard(
  raw: z.input<typeof removeSchema>,
): Promise<StaffRosterMutationResult> {
  const parsed = removeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Solicitud inválida" };
  }
  const input = parsed.data;
  const prepared = await prepareMutation(input.boardId, input.cardId);
  if (!prepared.ok) return prepared;
  const { actor, competitionId } = prepared;

  try {
    await removeCompetitionStaff(db, {
      competitionId,
      memberId: input.memberId,
    });
  } catch (error) {
    if (error instanceof CompetitionStaffError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  log.info("boards.staff_roster.removed", {
    boardId: input.boardId,
    competitionId,
    memberId: input.memberId,
    actorId: actor.id,
  });

  return {
    ok: true,
    message: "Quitado de la lista",
    data: await loadRoster(competitionId),
  };
}
