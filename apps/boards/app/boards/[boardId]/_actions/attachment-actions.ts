"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { cardAttachments } from "@workspace/db/schema";

import { requireBoardAccess } from "../_lib/board-access";

export async function addAttachmentAction(input: {
  boardId: number;
  cardId: number;
  name: string;
  url: string;
}) {
  await requireBoardAccess(input.boardId);

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

  revalidatePath(`/boards/${input.boardId}`);
}

export async function removeAttachmentAction(input: {
  boardId: number;
  attachmentId: number;
}) {
  await requireBoardAccess(input.boardId);

  await db
    .delete(cardAttachments)
    .where(eq(cardAttachments.id, input.attachmentId));

  revalidatePath(`/boards/${input.boardId}`);
}
