import {
  NotificationInbox,
  type NotificationInboxItem,
} from "@workspace/ui/components/notification-inbox";

type Inbox = { items: NotificationInboxItem[]; unreadCount: number };

/** Server component: loads the inbox and renders it styled for the navy AMS header. */
export async function AmsHeaderNotifications({
  getInbox,
  onMarkRead,
  onMarkAllRead,
}: {
  getInbox: () => Promise<Inbox>;
  onMarkRead: (id: number) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}) {
  let inbox: Inbox;
  try {
    inbox = await getInbox();
  } catch {
    return null;
  }

  return (
    <div className="[&_button]:text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
      <NotificationInbox
        items={inbox.items}
        unreadCount={inbox.unreadCount}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        onRefresh={getInbox}
      />
    </div>
  );
}
