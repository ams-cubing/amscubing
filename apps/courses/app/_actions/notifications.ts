"use server";

import { createNotificationHandlers } from "@workspace/auth/notifications";

import { auth } from "@/lib/auth";

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
