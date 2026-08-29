import { and, eq } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  boardMembers,
  boards,
  competitionDelegates,
  competitionOrganizers,
  user,
} from "@workspace/db/schema";

import { canAccessBoard, isBoardArchived } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";

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
  return currentUser;
}

export async function assertUserAssignableToBoard(
  boardId: number,
  userId: string,
) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  if (!board) {
    throw new Error("Tablero no encontrado");
  }

  const memberUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, wcaId: true },
  });
  if (!memberUser) throw new Error("Usuario no encontrado");

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
    db.query.competitionDelegates.findFirst({
      where: and(
        eq(competitionDelegates.competitionId, board.competitionId),
        eq(competitionDelegates.delegateWcaId, memberUser.wcaId),
      ),
    }),
    db.query.competitionOrganizers.findFirst({
      where: and(
        eq(competitionOrganizers.competitionId, board.competitionId),
        eq(competitionOrganizers.organizerWcaId, memberUser.wcaId),
      ),
    }),
  ]);

  if (!asDelegate && !asOrganizer) {
    throw new Error(
      "El miembro debe ser organizador, delegado de la competencia o invitado al tablero",
    );
  }
}
