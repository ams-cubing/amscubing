"use server";

import { createNotificationHandlers } from "@workspace/auth/notifications";
import { markCardNotificationsRead } from "@workspace/db/notifications";

import { auth } from "@/lib/auth";
import { canAccessBoard } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";

const inbox = createNotificationHandlers(() => auth);

export async function getNotificationInbox() {
  return inbox.getInbox();
}

export async function markNotificationReadAction(id: number) {
  await inbox.markRead(id);
}

export async function markAllNotificationsReadAction() {
  await inbox.markAllRead();
}

export async function markCardNotificationsReadAction(input: {
  boardId: number;
  cardId: number;
}) {
  const session = await requireSessionOrUnauthorized();
  const user = session.user;
  const allowed = await canAccessBoard(user, input.boardId);
  if (!allowed) {
    throw new Error("No tienes acceso a este tablero");
  }
  await markCardNotificationsRead(user.id, input.cardId);
}
