"use client";

import {
  AmsAccountMenu,
  type AmsAccountMenuUrls,
  type AmsAccountUser,
} from "@workspace/ui/components/ams-account-menu";
import { AmsSiteNav } from "@workspace/ui/components/ams-site-nav";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/_actions/auth";

export function BlogAmsNav({
  user,
  showBoardsLink = false,
  actions,
  urls,
}: {
  user: AmsAccountUser | null;
  showBoardsLink?: boolean;
  actions?: ReactNode;
  urls: AmsAccountMenuUrls;
}) {
  return (
    <AmsSiteNav
      active="Blog"
      webUrl={urls.webUrl}
      actions={actions}
      account={
        <AmsAccountMenu
          user={user}
          showBoardsLink={showBoardsLink}
          urls={urls}
          onSignOut={async () => {
            await signOutAction();
          }}
        />
      }
    />
  );
}
