"use client";

import {
  AmsAccountMenu,
  type AmsAccountUser,
} from "@workspace/ui/components/ams-account-menu";
import { AmsSiteNav } from "@workspace/ui/components/ams-site-nav";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/_actions/auth";

const COURSES_URL = "https://cursos.amscubing.org";

export function CalendarAmsNav({
  user,
  showBoardsLink = false,
  actions,
  signInHref,
  webUrl,
  calendarUrl,
  boardsUrl,
}: {
  user: AmsAccountUser | null;
  showBoardsLink?: boolean;
  actions?: ReactNode;
  signInHref: string;
  webUrl: string;
  calendarUrl: string;
  boardsUrl: string;
}) {
  return (
    <AmsSiteNav
      active={null}
      webUrl={webUrl}
      actions={actions}
      account={
        <AmsAccountMenu
          user={user}
          showBoardsLink={showBoardsLink}
          urls={{
            webUrl,
            calendarUrl,
            boardsUrl,
            coursesUrl: COURSES_URL,
            signInHref,
          }}
          onSignOut={async () => {
            await signOutAction();
          }}
        />
      }
    />
  );
}
