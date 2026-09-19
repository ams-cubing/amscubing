"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { boards, cardAttachments, competitions } from "@workspace/db/schema";

import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";

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

  const customText = input.customText.trim();
  if (!customText) {
    return {
      ok: false,
      message: "El texto personalizado del post es obligatorio",
    };
  }

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
