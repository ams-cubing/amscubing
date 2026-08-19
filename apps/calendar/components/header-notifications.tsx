import { NotificationInbox } from "@workspace/ui/components/notification-inbox";

import {
  getNotificationInbox,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/_actions/notifications";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function HeaderNotifications() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const inbox = await getNotificationInbox();

  return (
    <NotificationInbox
      items={inbox.items}
      unreadCount={inbox.unreadCount}
      onMarkRead={markNotificationReadAction}
      onMarkAllRead={markAllNotificationsReadAction}
      onRefresh={getNotificationInbox}
    />
  );
}
