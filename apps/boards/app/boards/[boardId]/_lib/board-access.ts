import { and, eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { isDelegatesBoard } from "@workspace/db/delegates-board";
import {
  boardLists,
  boardMembers,
  boards,
  cardAttachments,
  cardComments,
  cards,
  checklistItems,
  checklists,
  competitionDelegates,
  competitionOrganizers,
  labels,
  user,
} from "@workspace/db/schema";

import { canAccessBoard, isBoardArchived } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";

/** Stale cookie-cache sessions sometimes keep `user.id === wcaId` after a stub merge. */
const WCA_ID_AS_USER_ID_RE = /^\d{4}[A-Z]{4}\d{2}$/i;

/**
 * Cookie-cached sessions can keep a stale `user.id` after a WCA stub merge
 * (e.g. id still equal to the WCA ID). Resolve to the live `user.id` before
 * writing foreign keys. Normal Better Auth ids skip the DB round-trip.
 */
export async function resolveSessionUserId(actor: {
  id: string;
  wcaId: string | null;
}): Promise<string> {
  if (!WCA_ID_AS_USER_ID_RE.test(actor.id)) {
    return actor.id;
  }

  const wcaId = actor.wcaId?.trim().toUpperCase() || actor.id.toUpperCase();
  const byWca = await db.query.user.findFirst({
    where: eq(user.wcaId, wcaId),
    columns: { id: true },
  });
  if (byWca) return byWca.id;

  throw new Error("Sesión desactualizada; cierra sesión y vuelve a entrar");
}

export async function requireBoardAccess(boardId: number) {
  const session = await requireSessionOrUnauthorized();
  const currentUser = session.user;
  const allowed = await canAccessBoard(currentUser, boardId);
  if (!allowed) {
    throw new Error("No tienes acceso a este tablero");
  }
  if (await isBoardArchived(boardId)) {
    throw new Error("Este tablero está archivado y no se puede editar");
  }
  const id = await resolveSessionUserId(currentUser);
  return id === currentUser.id ? currentUser : { ...currentUser, id };
}

export async function assertListOnBoard(boardId: number, listId: number) {
  const list = await db.query.boardLists.findFirst({
    where: and(eq(boardLists.id, listId), eq(boardLists.boardId, boardId)),
  });
  if (!list) throw new Error("Lista no encontrada");
  return list;
}

export async function assertCardOnBoard(boardId: number, cardId: number) {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    columns: { id: true, title: true, listId: true },
    with: {
      list: { columns: { title: true, boardId: true } },
    },
  });
  if (!card || card.list?.boardId !== boardId) {
    throw new Error("Tarjeta no encontrada");
  }
  return card;
}

export async function assertLabelOnBoard(boardId: number, labelId: number) {
  const label = await db.query.labels.findFirst({
    where: and(eq(labels.id, labelId), eq(labels.boardId, boardId)),
  });
  if (!label) throw new Error("Etiqueta no encontrada");
  return label;
}

export async function assertAttachmentOnBoard(
  boardId: number,
  attachmentId: number,
) {
  const attachment = await db.query.cardAttachments.findFirst({
    where: eq(cardAttachments.id, attachmentId),
    columns: { id: true, cardId: true, name: true, url: true },
    with: {
      card: {
        columns: { id: true },
        with: {
          list: { columns: { boardId: true } },
        },
      },
    },
  });
  if (!attachment || attachment.card?.list?.boardId !== boardId) {
    throw new Error("Adjunto no encontrado");
  }
  return attachment;
}

export async function assertChecklistOnBoard(
  boardId: number,
  checklistId: number,
) {
  const checklist = await db.query.checklists.findFirst({
    where: eq(checklists.id, checklistId),
    columns: { id: true, cardId: true, title: true },
    with: {
      card: {
        columns: { id: true },
        with: {
          list: { columns: { boardId: true } },
        },
      },
    },
  });
  if (!checklist || checklist.card?.list?.boardId !== boardId) {
    throw new Error("Checklist no encontrado");
  }
  return checklist;
}

export async function assertChecklistItemOnBoard(
  boardId: number,
  itemId: number,
) {
  const item = await db.query.checklistItems.findFirst({
    where: eq(checklistItems.id, itemId),
    columns: { id: true, checklistId: true, title: true, done: true },
    with: {
      checklist: {
        columns: { id: true },
        with: {
          card: {
            columns: { id: true },
            with: {
              list: { columns: { boardId: true } },
            },
          },
        },
      },
    },
  });
  if (!item || item.checklist?.card?.list?.boardId !== boardId) {
    throw new Error("Elemento de checklist no encontrado");
  }
  return item;
}

export async function assertCommentOnBoard(boardId: number, commentId: number) {
  const comment = await db.query.cardComments.findFirst({
    where: eq(cardComments.id, commentId),
    columns: {
      id: true,
      cardId: true,
      authorId: true,
      body: true,
    },
    with: {
      card: {
        columns: { id: true },
        with: {
          list: { columns: { boardId: true } },
        },
      },
    },
  });
  if (!comment || comment.card?.list?.boardId !== boardId) {
    throw new Error("Comentario no encontrado");
  }
  return comment;
}

export async function assertUserAssignableToBoard(
  boardId: number,
  userId: string,
) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { name: true, isTemplate: true, competitionId: true },
  });
  if (!board) {
    throw new Error("Tablero no encontrado");
  }

  const memberUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, wcaId: true, role: true },
  });
  if (!memberUser) throw new Error("Usuario no encontrado");

  if (isDelegatesBoard(board)) {
    if (memberUser.role !== "delegate") {
      throw new Error("En este tablero solo se puede asignar a delegados");
    }
    return;
  }

  const asBoardMember = await db.query.boardMembers.findFirst({
    where: and(
      eq(boardMembers.boardId, boardId),
      eq(boardMembers.userId, userId),
    ),
  });
  if (asBoardMember) return;

  if (!board.competitionId) {
    throw new Error("El miembro debe haber sido invitado al tablero");
  }

  const [asDelegate, asOrganizer] = await Promise.all([
    memberUser.wcaId
      ? db.query.competitionDelegates.findFirst({
          where: and(
            eq(competitionDelegates.competitionId, board.competitionId),
            eq(competitionDelegates.delegateWcaId, memberUser.wcaId),
          ),
        })
      : undefined,
    db.query.competitionOrganizers.findFirst({
      where: and(
        eq(competitionOrganizers.competitionId, board.competitionId),
        eq(competitionOrganizers.organizerUserId, memberUser.id),
      ),
    }),
  ]);

  if (!asDelegate && !asOrganizer) {
    throw new Error(
      "El miembro debe ser organizador, delegado de la competencia o invitado al tablero",
    );
  }
}
