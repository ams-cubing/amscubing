"use server";

import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@workspace/db/notifications";

import { headers } from "next/headers";

async function currentUserId() {
  if (!process.env.BETTER_AUTH_SECRET) return null;
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id ?? null;
}

export async function getNotificationInbox() {
  const userId = await currentUserId();
  if (!userId) {
    return { items: [], unreadCount: 0 };
  }

  const [items, unreadCount] = await Promise.all([
    listNotificationsForUser(userId),
    countUnreadNotifications(userId),
  ]);

  return { items, unreadCount };
}

export async function markNotificationReadAction(id: number) {
  const userId = await currentUserId();
  if (!userId) return;
  await markNotificationRead(userId, id);
}

export async function markAllNotificationsReadAction() {
  const userId = await currentUserId();
  if (!userId) return;
  await markAllNotificationsRead(userId);
}
