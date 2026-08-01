"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import {
  boardLists,
  cardAttachments,
  cardLabels,
  cards,
  checklistItems,
  checklists,
  type User,
} from "@workspace/db/schema";

import { canAccessBoard } from "@/lib/boards";
import { requireSession } from "@/lib/session";

async function requireBoardAccess(boardId: number) {
  const session = await requireSession();
  const user = session.user as unknown as User;
  const allowed = await canAccessBoard(user, boardId);
  if (!allowed) {
    throw new Error("No tienes acceso a este tablero");
  }
  return user;
}

export async function moveCardAction(input: {
  boardId: number;
  cardId: number;
  toListId: number;
  toPosition: number;
  orderedCardIdsInTargetList: number[];
}) {
  await requireBoardAccess(input.boardId);

  const list = await db.query.boardLists.findFirst({
    where: and(
      eq(boardLists.id, input.toListId),
      eq(boardLists.boardId, input.boardId),
    ),
  });
  if (!list) throw new Error("Lista no encontrada");

  await db
    .update(cards)
    .set({ listId: input.toListId, position: input.toPosition })
    .where(eq(cards.id, input.cardId));

  await Promise.all(
    input.orderedCardIdsInTargetList.map((id, position) =>
      db
        .update(cards)
        .set({ listId: input.toListId, position })
        .where(eq(cards.id, id)),
    ),
  );

  revalidatePath(`/boards/${input.boardId}`);
}

export async function updateCardAction(input: {
  boardId: number;
  cardId: number;
  title?: string;
  description?: string | null;
}) {
  await requireBoardAccess(input.boardId);

  await db
    .update(cards)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    })
    .where(eq(cards.id, input.cardId));

  revalidatePath(`/boards/${input.boardId}`);
}

export async function toggleCardLabelAction(input: {
  boardId: number;
  cardId: number;
  labelId: number;
  checked: boolean;
}) {
  await requireBoardAccess(input.boardId);

  if (input.checked) {
    await db
      .insert(cardLabels)
      .values({ cardId: input.cardId, labelId: input.labelId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(cardLabels)
      .where(
        and(
          eq(cardLabels.cardId, input.cardId),
          eq(cardLabels.labelId, input.labelId),
        ),
      );
  }

  revalidatePath(`/boards/${input.boardId}`);
}

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

export async function createCardAction(input: {
  boardId: number;
  listId: number;
  title: string;
}) {
  await requireBoardAccess(input.boardId);

  const list = await db.query.boardLists.findFirst({
    where: and(
      eq(boardLists.id, input.listId),
      eq(boardLists.boardId, input.boardId),
    ),
  });
  if (!list) throw new Error("Lista no encontrada");

  const existing = await db.query.cards.findMany({
    where: eq(cards.listId, input.listId),
    columns: { position: true },
  });
  const nextPosition =
    existing.reduce((max, card) => Math.max(max, card.position), -1) + 1;

  await db.insert(cards).values({
    listId: input.listId,
    title: input.title.trim(),
    position: nextPosition,
  });

  revalidatePath(`/boards/${input.boardId}`);
}
