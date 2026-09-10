"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { cardLabels, labels } from "@workspace/db/schema";

import { createLabelSchema, labelColorSchema } from "@/app/_lib/validations";

import {
  assertCardOnBoard,
  assertLabelOnBoard,
  requireBoardAccess,
} from "../_lib/board-access";

export async function createLabelAction(input: {
  boardId: number;
  cardId?: number;
  name: string;
  color: string;
}) {
  const validated = createLabelSchema.parse(input);
  await requireBoardAccess(validated.boardId);

  if (validated.cardId !== undefined) {
    await assertCardOnBoard(validated.boardId, validated.cardId);
  }

  const [label] = await db
    .insert(labels)
    .values({
      boardId: validated.boardId,
      name: validated.name,
      color: validated.color,
    })
    .returning();

  if (!label) throw new Error("No se pudo crear la etiqueta");

  if (validated.cardId !== undefined) {
    await db
      .insert(cardLabels)
      .values({ cardId: validated.cardId, labelId: label.id })
      .onConflictDoNothing();
  }

  revalidatePath(`/boards/${validated.boardId}`);
  return label;
}

export async function updateLabelAction(input: {
  boardId: number;
  labelId: number;
  name: string;
  color: string;
}) {
  await requireBoardAccess(input.boardId);
  await assertLabelOnBoard(input.boardId, input.labelId);

  const name = input.name.trim();
  if (!name) throw new Error("El nombre de la etiqueta es obligatorio");

  const color = labelColorSchema.parse(input.color);

  await db
    .update(labels)
    .set({ name, color })
    .where(eq(labels.id, input.labelId));

  revalidatePath(`/boards/${input.boardId}`);
}

export async function deleteLabelAction(input: {
  boardId: number;
  labelId: number;
}) {
  await requireBoardAccess(input.boardId);
  await assertLabelOnBoard(input.boardId, input.labelId);

  await db.delete(labels).where(eq(labels.id, input.labelId));

  revalidatePath(`/boards/${input.boardId}`);
}

export async function toggleCardLabelAction(input: {
  boardId: number;
  cardId: number;
  labelId: number;
  checked: boolean;
}) {
  await requireBoardAccess(input.boardId);
  await assertCardOnBoard(input.boardId, input.cardId);
  await assertLabelOnBoard(input.boardId, input.labelId);

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
