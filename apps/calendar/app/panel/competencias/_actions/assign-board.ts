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
  revalidatePath("/mis-competencias");
}

export async function assignBoardToCompetitionById(
  competitionId: number,
  templateKey: BoardTemplateKey = "competition",
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
) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { error: authResult.message };
  }
  if (!isBoardTemplateKey(templateKey)) {
    return { error: "Plantilla no válida" };
  }

  return assignBoardToCompetitionById(competitionId, templateKey);
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
