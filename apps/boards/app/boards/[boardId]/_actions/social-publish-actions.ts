"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import { db } from "@workspace/db";
import { boards, cardAttachments, competitions } from "@workspace/db/schema";
import {
  completeCompetitionInstagramPublish,
  markCompetitionSocialPublishedManually,
  retryCompetitionSocialPublish,
  type CompetitionSocialMutationResult,
} from "@workspace/social";

import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";
import { requireDelegate } from "@/lib/session";

export type SaveCompetitionSocialFieldsResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function saveCompetitionSocialFields(input: {
  boardId: number;
  cardId: number;
  customText: string;
  tags: string;
  flyerUrl: string | null;
}): Promise<SaveCompetitionSocialFieldsResult> {
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

  const customText = input.customText.trim() || null;
  const tags = input.tags.trim() || null;
  const flyerUrl = input.flyerUrl?.trim() || null;

  await db
    .update(competitions)
    .set({
      socialCustomText: customText,
      socialTags: tags,
      socialFlyerUrl: flyerUrl,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, board.competitionId));

  if (flyerUrl) {
    const existing = await db.query.cardAttachments.findFirst({
      where: (a, { and, eq: eqa }) =>
        and(eqa(a.cardId, input.cardId), eqa(a.name, "Flyer redes")),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(cardAttachments)
        .set({ url: flyerUrl, name: "Flyer redes" })
        .where(eq(cardAttachments.id, existing.id));
    } else {
      await db.insert(cardAttachments).values({
        cardId: input.cardId,
        name: "Flyer redes",
        url: flyerUrl,
      });
    }
  }

  revalidatePath(`/boards/${input.boardId}`);
  return { ok: true, message: "Datos de publicación guardados" };
}

async function requireDelegateBoardCompetition(boardId: number) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false as const, message: authResult.message };
  }

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });

  if (!board?.competitionId) {
    return {
      ok: false as const,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  return {
    ok: true as const,
    competitionId: board.competitionId,
  };
}

function revalidateBoardSocial(boardId: number) {
  revalidatePath(`/boards/${boardId}`);
  revalidateTag("competitions", "days");
}

export async function retryBoardCompetitionSocialPublish(
  boardId: number,
): Promise<CompetitionSocialMutationResult> {
  const gate = await requireDelegateBoardCompetition(boardId);
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  const result = await retryCompetitionSocialPublish(gate.competitionId);
  if (result.ok) {
    revalidateBoardSocial(boardId);
  }
  return result;
}

export async function completeBoardCompetitionInstagramPublish(
  boardId: number,
): Promise<CompetitionSocialMutationResult> {
  const gate = await requireDelegateBoardCompetition(boardId);
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  const result = await completeCompetitionInstagramPublish(gate.competitionId);
  if (result.ok) {
    revalidateBoardSocial(boardId);
  }
  return result;
}

export async function markBoardCompetitionSocialManual(
  boardId: number,
): Promise<CompetitionSocialMutationResult> {
  const gate = await requireDelegateBoardCompetition(boardId);
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  const result = await markCompetitionSocialPublishedManually(
    gate.competitionId,
  );
  if (result.ok) {
    revalidateBoardSocial(boardId);
  }
  return result;
}
