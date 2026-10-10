import { headers } from "next/headers";
import { NotificationInbox } from "@workspace/ui/components/notification-inbox";

import {
  getNotificationInbox,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/_actions/notifications";

async function isSignedIn() {
  if (!process.env.BETTER_AUTH_SECRET) return false;
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user != null;
  } catch {
    return false;
  }
}

export async function HeaderNotifications() {
  if (!(await isSignedIn())) return null;

  let inbox: Awaited<ReturnType<typeof getNotificationInbox>>;
  try {
    inbox = await getNotificationInbox();
  } catch {
    // Database unavailable in local/static fallbacks.
    return null;
  }

  return (
    <div className="[&_button]:text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
      <NotificationInbox
        items={inbox.items}
        unreadCount={inbox.unreadCount}
        onMarkRead={markNotificationReadAction}
        onMarkAllRead={markAllNotificationsReadAction}
        onRefresh={getNotificationInbox}
      />
    </div>
  );
}
