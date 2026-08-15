"use server";

import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";

import { cloneBoardFromTemplate } from "@workspace/db/clone-board";
import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { isBoardsEnabled } from "@/lib/boards";

export async function assignBoardToCompetition(competitionId: number) {
  if (!isBoardsEnabled()) {
    return { error: "Tableros AMS no están habilitados" };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "No autenticado" };
  }

  if (session.user.role !== "delegate") {
    return { error: "Solo delegados pueden asignar tableros" };
  }

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
