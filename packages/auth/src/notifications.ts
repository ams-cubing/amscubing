import { headers } from "next/headers";

import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@workspace/db/notifications";

import type { Auth } from "./auth";

/**
 * Inbox operations bound to the current session. Server-action files can only
 * export async functions, so each app wraps these in its own `"use server"` module.
 */
export function createNotificationHandlers(
  loadAuth: () => Auth | null | Promise<Auth | null>,
) {
  async function currentUserId() {
    const auth = await loadAuth();
    if (!auth) return null;
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
  }

  return {
    async getInbox() {
      const userId = await currentUserId();
      if (!userId) return { items: [], unreadCount: 0 };
      const [items, unreadCount] = await Promise.all([
        listNotificationsForUser(userId),
        countUnreadNotifications(userId),
      ]);
      return { items, unreadCount };
    },
    async markRead(id: number) {
      const userId = await currentUserId();
      if (!userId) return;
      await markNotificationRead(userId, id);
    },
    async markAllRead() {
      const userId = await currentUserId();
      if (!userId) return;
      await markAllNotificationsRead(userId);
    },
  };
}
