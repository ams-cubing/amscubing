"use client";

import {
  AmsAccountMenu,
  type AmsAccountUser,
} from "@workspace/ui/components/ams-account-menu";

import { authClient } from "@/lib/auth-client";
import { COURSES_URL } from "@/lib/content";

export function SiteNavAccount({
  showBoardsLink = false,
  initialUser,
  webUrl,
  calendarUrl,
  boardsUrl,
  signInHref,
}: {
  showBoardsLink?: boolean;
  initialUser?: AmsAccountUser | null;
  webUrl: string;
  calendarUrl: string;
  boardsUrl: string;
  signInHref: string;
}) {
  const { data: session, isPending } = authClient.useSession();
  const sessionUser = session?.user;
  const user: AmsAccountUser | null | undefined = sessionUser
    ? {
        name: sessionUser.name,
        image: sessionUser.image,
        email: sessionUser.email,
      }
    : isPending
      ? initialUser
      : null;

  return (
    <AmsAccountMenu
      user={user}
      isPending={isPending && !initialUser}
      showBoardsLink={showBoardsLink}
      urls={{
        webUrl,
        calendarUrl,
        boardsUrl,
        coursesUrl: COURSES_URL,
        signInHref,
      }}
      onSignOut={async () => {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = `${webUrl}/cuenta`;
            },
          },
        });
      }}
    />
  );
}
