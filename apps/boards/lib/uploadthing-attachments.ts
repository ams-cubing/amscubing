import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { cardAttachments, cards, type User } from "@workspace/db/schema";

import { canAccessBoard, isBoardArchived } from "@/lib/boards";

export async function assertBoardUploadAccess(user: User, boardId: number) {
  const allowed = await canAccessBoard(user, boardId);
  if (!allowed) {
    throw new Error("Sin acceso al tablero");
  }
  if (await isBoardArchived(boardId)) {
    throw new Error("Este tablero está archivado y no se puede editar");
  }
}

export async function assertCardBelongsToBoard(
  boardId: number,
  cardId: number,
) {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    columns: { id: true },
    with: {
      list: { columns: { boardId: true } },
    },
  });
  if (!card || card.list?.boardId !== boardId) {
    throw new Error("Tarjeta no encontrada");
  }
  return card;
}

export async function insertUploadedCardAttachment(input: {
  boardId: number;
  cardId: number;
  name: string;
  url: string;
}) {
  const name = input.name.trim() || input.url.trim();
  const url = input.url.trim();

  const [row] = await db
    .insert(cardAttachments)
    .values({
      cardId: input.cardId,
      name,
      url,
    })
    .returning({ id: cardAttachments.id });

  revalidatePath(`/boards/${input.boardId}`);

  return {
    attachmentId: row!.id,
    name,
    url,
  };
}
