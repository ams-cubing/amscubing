"use server";

import { createNotificationHandlers } from "@workspace/auth/notifications";

const inbox = createNotificationHandlers(async () => {
  if (!process.env.BETTER_AUTH_SECRET) return null;
  const { auth } = await import("@/lib/auth");
  return auth;
});

export async function getNotificationInbox() {
  return inbox.getInbox();
}

export async function markNotificationReadAction(id: number) {
  await inbox.markRead(id);
}

export async function markAllNotificationsReadAction() {
  await inbox.markAllRead();
}
