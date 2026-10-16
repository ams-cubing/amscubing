"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { cardAttachments, cards } from "@workspace/db/schema";

import {
  assertAttachmentOnBoard,
  assertCardOnBoard,
  requireBoardAccess,
} from "../_lib/board-access";

export async function addAttachmentAction(input: {
  boardId: number;
  cardId: number;
  name: string;
  url: string;
}) {
  await requireBoardAccess(input.boardId);
  await assertCardOnBoard(input.boardId, input.cardId);

  await db.insert(cardAttachments).values({
    cardId: input.cardId,
    name: input.name.trim() || input.url,
    url: input.url.trim(),
  });

  revalidatePath(`/boards/${input.boardId}`);
}

export async function updateAttachmentAction(input: {
  boardId: number;
  attachmentId: number;
  name: string;
  url: string;
}) {
  await requireBoardAccess(input.boardId);
  const attachment = await assertAttachmentOnBoard(
    input.boardId,
    input.attachmentId,
  );

  const name = input.name.trim();
  const url = input.url.trim();
  if (!url) throw new Error("La URL del adjunto no puede estar vacía");

  await db
    .update(cardAttachments)
    .set({
      name: name || url,
      url,
    })
    .where(eq(cardAttachments.id, input.attachmentId));

  if (attachment.url !== url) {
    await db
      .update(cards)
      .set({ coverUrl: url })
      .where(
        and(eq(cards.id, attachment.cardId), eq(cards.coverUrl, attachment.url)),
      );
  }

  revalidatePath(`/boards/${input.boardId}`);
}

export async function removeAttachmentAction(input: {
  boardId: number;
  attachmentId: number;
}) {
  await requireBoardAccess(input.boardId);
  const attachment = await assertAttachmentOnBoard(
    input.boardId,
    input.attachmentId,
  );

  await db
    .delete(cardAttachments)
    .where(eq(cardAttachments.id, input.attachmentId));

  await db
    .update(cards)
    .set({ coverUrl: null })
    .where(
      and(eq(cards.id, attachment.cardId), eq(cards.coverUrl, attachment.url)),
    );

  revalidatePath(`/boards/${input.boardId}`);
}

export async function setCardCoverAction(input: {
  boardId: number;
  cardId: number;
  /** Attachment URL to use as cover, or null to clear. */
  coverUrl: string | null;
}) {
  await requireBoardAccess(input.boardId);
  await assertCardOnBoard(input.boardId, input.cardId);

  const coverUrl = input.coverUrl?.trim() || null;
  if (coverUrl) {
    const attachment = await db.query.cardAttachments.findFirst({
      where: and(
        eq(cardAttachments.cardId, input.cardId),
        eq(cardAttachments.url, coverUrl),
      ),
      columns: { id: true },
    });
    if (!attachment) {
      throw new Error("El adjunto de portada no pertenece a esta tarjeta");
    }
  }

  await db
    .update(cards)
    .set({ coverUrl })
    .where(eq(cards.id, input.cardId));

  revalidatePath(`/boards/${input.boardId}`);
}
