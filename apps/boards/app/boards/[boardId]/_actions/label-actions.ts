"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { cardLabels, labels } from "@workspace/db/schema";

import { createLabelSchema, labelColorSchema } from "@/app/_lib/validations";

import { requireBoardAccess } from "../_lib/board-access";

export async function createLabelAction(input: {
  boardId: number;
  cardId?: number;
  name: string;
  color: string;
}) {
  const validated = createLabelSchema.parse(input);
  await requireBoardAccess(validated.boardId);

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

  const name = input.name.trim();
  if (!name) throw new Error("El nombre de la etiqueta es obligatorio");

  const color = labelColorSchema.parse(input.color);

  const label = await db.query.labels.findFirst({
    where: and(eq(labels.id, input.labelId), eq(labels.boardId, input.boardId)),
  });
  if (!label) throw new Error("Etiqueta no encontrada");

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

  const label = await db.query.labels.findFirst({
    where: and(eq(labels.id, input.labelId), eq(labels.boardId, input.boardId)),
  });
  if (!label) throw new Error("Etiqueta no encontrada");

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
