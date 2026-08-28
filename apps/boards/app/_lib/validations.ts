import { z } from "zod";

export const boardIdSchema = z.number().int().positive();
export const cardIdSchema = z.number().int().positive();
export const listIdSchema = z.number().int().positive();
export const labelIdSchema = z.number().int().positive();

export const labelColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color de etiqueta no válido");

export const boardNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio");

export const createBlankBoardSchema = z.object({
  name: boardNameSchema,
});

export const createTemplateSchema = z.object({
  name: boardNameSchema,
});

export const createCardSchema = z.object({
  boardId: boardIdSchema,
  listId: listIdSchema,
  title: z.string().trim().min(1, "El título de la tarjeta es obligatorio"),
});

export const createLabelSchema = z.object({
  boardId: boardIdSchema,
  cardId: cardIdSchema.optional(),
  name: z.string().trim().min(1, "El nombre de la etiqueta es obligatorio"),
  color: labelColorSchema,
});

export const addCardCommentSchema = z.object({
  boardId: boardIdSchema,
  cardId: cardIdSchema,
  body: z.string().trim().min(1, "El comentario no puede estar vacío"),
});
