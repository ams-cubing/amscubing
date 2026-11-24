"use server";

import { revalidatePath, updateTag } from "next/cache";

import {
  cloneBoardFromTemplate,
  competitionBoardName,
  switchBoardTemplate,
} from "@workspace/db/clone-board";
import { db } from "@workspace/db";
import {
  isBoardTemplateKey,
  type BoardTemplateKey,
} from "@workspace/db/data/board-templates";
import { setBoardBoardsToolsBeta } from "@workspace/db/beta-features";
import { competitions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

import { getErrorMessage } from "@/lib/handle-error";
import { requireDelegate } from "@/lib/session";
import { log } from "@workspace/server/log";

function revalidateCompetitionBoard(competitionId: number) {
  updateTag("competitions");
  updateTag(`competition-${competitionId}`);
  revalidatePath("/panel/competencias");
  revalidatePath("/panel");
  revalidatePath(`/panel/competencias/${competitionId}`);
  revalidatePath(`/panel/competencias/${competitionId}/editar`);
  revalidatePath(`/panel/competencias/${competitionId}/costos`);
  revalidatePath("/mis-competencias");
}

export async function assignBoardToCompetitionById(
  competitionId: number,
  templateKey: BoardTemplateKey = "competition",
  boardsToolsBeta = false,
) {
  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: {
      id: true,
      name: true,
      city: true,
      startDate: true,
      boardId: true,
    },
  });

  if (!competition) {
    return { error: "Competencia no encontrada" };
  }

  if (competition.boardId) {
    return { boardId: competition.boardId };
  }

  try {
    const board = await cloneBoardFromTemplate({
      competitionId: competition.id,
      boardName: competitionBoardName(competition),
      templateKey,
      boardsToolsBeta,
    });

    revalidateCompetitionBoard(competitionId);
    return { boardId: board.id };
  } catch (error) {
    log.error("calendar.assign_board_failed", { error });
    return {
      error: getErrorMessage(error),
    };
  }
}

export async function assignBoardToCompetition(
  competitionId: number,
  templateKey: BoardTemplateKey,
  boardsToolsBeta = false,
) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { error: authResult.message };
  }
  if (!isBoardTemplateKey(templateKey)) {
    return { error: "Plantilla no válida" };
  }

  return assignBoardToCompetitionById(
    competitionId,
    templateKey,
    boardsToolsBeta,
  );
}

export async function switchCompetitionBoardTemplate(
  competitionId: number,
  templateKey: BoardTemplateKey,
) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { error: authResult.message };
  }
  if (!isBoardTemplateKey(templateKey)) {
    return { error: "Plantilla no válida" };
  }

  try {
    const board = await switchBoardTemplate({ competitionId, templateKey });
    log.info("calendar.board_template_switched", {
      competitionId,
      templateKey,
      boardId: board.id,
      actorId: authResult.session.user.id,
    });
    revalidateCompetitionBoard(competitionId);
    return { boardId: board.id };
  } catch (error) {
    log.error("calendar.switch_board_template_failed", { error });
    return { error: getErrorMessage(error) };
  }
}

export async function setCompetitionBoardsToolsBeta(
  competitionId: number,
  enabled: boolean,
) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { error: authResult.message };
  }

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: { id: true, boardId: true },
  });
  if (!competition?.boardId) {
    return { error: "La competencia no tiene tablero" };
  }

  try {
    const { changed } = await setBoardBoardsToolsBeta(db, {
      boardId: competition.boardId,
      enabled,
      actorId: authResult.session.user.id,
    });
    log.info("calendar.boards_tools_beta_changed", {
      competitionId,
      boardId: competition.boardId,
      enabled,
      actorId: authResult.session.user.id,
      changed,
    });
    revalidateCompetitionBoard(competitionId);
    return { boardId: competition.boardId };
  } catch (error) {
    log.error("calendar.boards_tools_beta_failed", { error });
    return { error: getErrorMessage(error) };
  }
}
