"use server";

import { revalidatePath, updateTag } from "next/cache";

import { cloneBoardFromTemplate } from "@workspace/db/clone-board";
import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

import { isBoardsEnabled } from "@/lib/boards";
import { requireDelegate } from "@/lib/session";

export async function assignBoardToCompetitionById(competitionId: number) {
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
    const boardName =
      competition.name?.trim() ||
      `${competition.city} — ${competition.startDate}`;

    const board = await cloneBoardFromTemplate({
      competitionId: competition.id,
      boardName,
    });

    updateTag("competitions");
    updateTag(`competition-${competitionId}`);
    revalidatePath("/panel");
    revalidatePath(`/panel/competencias/${competitionId}`);
    revalidatePath(`/panel/competencias/${competitionId}/editar`);
    revalidatePath("/mis-competencias");

    return { boardId: board.id };
  } catch (error) {
    console.error(error);
    return {
      error:
        error instanceof Error ? error.message : "No se pudo crear el tablero",
    };
  }
}

export async function assignBoardToCompetition(competitionId: number) {
  if (!isBoardsEnabled()) {
    return { error: "Tableros AMS no están habilitados" };
  }

  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { error: authResult.message };
  }

  return assignBoardToCompetitionById(competitionId);
}
