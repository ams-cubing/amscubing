import { NotificationInbox } from "@workspace/ui/components/notification-inbox";

import {
  getNotificationInbox,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/_actions/notifications";

export async function HeaderNotifications() {
  const inbox = await getNotificationInbox();

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
