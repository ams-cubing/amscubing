"use client";

import type { ReactNode } from "react";

import {
  AmsAccountMenu,
  type AmsAccountMenuUrls,
  type AmsAccountUser,
} from "@workspace/ui/components/ams-account-menu";
import {
  AmsSiteNav,
  type AmsNavItemLabel,
} from "@workspace/ui/components/ams-site-nav";

/** AMS header with the shared account menu, for apps that sign out through a server action. */
export function AmsAppNav({
  active = null,
  user,
  showBoardsLink = false,
  actions,
  urls,
  onSignOut,
}: {
  active?: AmsNavItemLabel | null;
  user: AmsAccountUser | null;
  showBoardsLink?: boolean;
  actions?: ReactNode;
  urls: AmsAccountMenuUrls;
  onSignOut?: () => void | Promise<void>;
}) {
  return (
    <AmsSiteNav
      active={active}
      webUrl={urls.webUrl}
      actions={actions}
      account={
        <AmsAccountMenu
          user={user}
          showBoardsLink={showBoardsLink}
          urls={urls}
          onSignOut={
            onSignOut
              ? async () => {
                  await onSignOut();
                }
              : undefined
          }
        />
      }
    />
  );
}
