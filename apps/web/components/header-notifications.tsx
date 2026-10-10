import { headers } from "next/headers";
import { AmsHeaderNotifications } from "@workspace/ui/components/ams-header-notifications";

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

  return (
    <AmsHeaderNotifications
      getInbox={getNotificationInbox}
      onMarkRead={markNotificationReadAction}
      onMarkAllRead={markAllNotificationsReadAction}
    />
  );
}
