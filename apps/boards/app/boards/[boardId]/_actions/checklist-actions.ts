"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { checklistItems, checklists } from "@workspace/db/schema";

import { requireBoardAccess } from "../_lib/board-access";

export async function toggleChecklistItemAction(input: {
  boardId: number;
  itemId: number;
  done: boolean;
}) {
  await requireBoardAccess(input.boardId);

  await db
    .update(checklistItems)
    .set({ done: input.done })
    .where(eq(checklistItems.id, input.itemId));

  revalidatePath(`/boards/${input.boardId}`);
}

export async function addChecklistItemAction(input: {
  boardId: number;
  checklistId: number;
  title: string;
}) {
  await requireBoardAccess(input.boardId);

  const existing = await db.query.checklistItems.findMany({
    where: eq(checklistItems.checklistId, input.checklistId),
    columns: { position: true },
  });
  const nextPosition =
    existing.reduce((max, item) => Math.max(max, item.position), -1) + 1;

  await db.insert(checklistItems).values({
    checklistId: input.checklistId,
    title: input.title.trim(),
    done: false,
    position: nextPosition,
  });

  revalidatePath(`/boards/${input.boardId}`);
}

export async function addChecklistAction(input: {
  boardId: number;
  cardId: number;
  title: string;
}) {
  await requireBoardAccess(input.boardId);

  await db.insert(checklists).values({
    cardId: input.cardId,
    title: input.title.trim() || "Checklist",
    position: 0,
  });

  revalidatePath(`/boards/${input.boardId}`);
}

export async function deleteChecklistAction(input: {
  boardId: number;
  checklistId: number;
}) {
  await requireBoardAccess(input.boardId);

  await db.delete(checklists).where(eq(checklists.id, input.checklistId));

  revalidatePath(`/boards/${input.boardId}`);
}
