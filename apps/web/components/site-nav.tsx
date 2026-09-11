import { headers } from "next/headers";
import { Suspense } from "react";
import {
  AmsSiteNav,
  type AmsNavItemLabel,
} from "@workspace/ui/components/ams-site-nav";
import { canAccessBoardsApp } from "@workspace/auth/boards-access";
import { toSessionUser, type RawSessionUser } from "@workspace/auth/types";

import { SiteNavAccount } from "@/components/site-nav-account";
import { getBoardsUrl, getCalendarUrl, getWebUrl } from "@/lib/urls";

export function SiteNav({ active = "Inicio" }: { active?: AmsNavItemLabel }) {
  const webUrl = getWebUrl();
  const calendarUrl = getCalendarUrl();
  const boardsUrl = getBoardsUrl();

  return (
    <AmsSiteNav
      active={active}
      webUrl={webUrl}
      account={
        <Suspense
          fallback={
            <SiteNavAccount
              webUrl={webUrl}
              calendarUrl={calendarUrl}
              boardsUrl={boardsUrl}
            />
          }
        >
          <SiteNavAccountFromSession
            webUrl={webUrl}
            calendarUrl={calendarUrl}
            boardsUrl={boardsUrl}
          />
        </Suspense>
      }
    />
  );
}

async function SiteNavAccountFromSession({
  webUrl,
  calendarUrl,
  boardsUrl,
}: {
  webUrl: string;
  calendarUrl: string;
  boardsUrl: string;
}) {
  let showBoardsLink = false;
  let initialUser: {
    name: string;
    image?: string | null;
    email?: string | null;
  } | null = null;

  if (process.env.BETTER_AUTH_SECRET) {
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (session?.user) {
        const user = toSessionUser(session.user as RawSessionUser);
        showBoardsLink = await canAccessBoardsApp(user);
        initialUser = {
          name: user.name,
          image: user.image,
          email: user.email,
        };
      }
    } catch {
      // Auth unavailable in local/static fallbacks.
    }
  }

  return (
    <SiteNavAccount
      showBoardsLink={showBoardsLink}
      initialUser={initialUser}
      webUrl={webUrl}
      calendarUrl={calendarUrl}
      boardsUrl={boardsUrl}
    />
  );
}
