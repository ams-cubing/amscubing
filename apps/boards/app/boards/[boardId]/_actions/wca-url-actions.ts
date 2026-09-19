"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { boards, competitions } from "@workspace/db/schema";
import {
  fetchWcaCompetition,
  normalizeWcaCompetitionUrl,
} from "@workspace/social";

import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";

export type SaveCompetitionWcaUrlResult =
  | { ok: true; message: string; wcaCompetitionUrl: string | null }
  | { ok: false; message: string };

export async function saveCompetitionWcaUrl(input: {
  boardId: number;
  cardId: number;
  wcaCompetitionUrl: string;
}): Promise<SaveCompetitionWcaUrlResult> {
  await requireBoardAccess(input.boardId);
  await assertCardOnBoard(input.boardId, input.cardId);

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, input.boardId),
    columns: { competitionId: true },
  });

  if (!board?.competitionId) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  const rawUrl = input.wcaCompetitionUrl.trim();
  let wcaCompetitionUrl: string | null = null;

  if (rawUrl) {
    const normalized = normalizeWcaCompetitionUrl(rawUrl);
    const wca = await fetchWcaCompetition(normalized);
    if (!wca.ok) {
      return { ok: false, message: wca.message };
    }
    wcaCompetitionUrl = wca.competition.url;
  }

  await db
    .update(competitions)
    .set({
      wcaCompetitionUrl,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, board.competitionId));

  revalidatePath(`/boards/${input.boardId}`);
  return {
    ok: true,
    message: wcaCompetitionUrl
      ? "URL de la WCA guardada"
      : "URL de la WCA eliminada",
    wcaCompetitionUrl,
  };
}
