import { Unbounded, Saira, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

import "@workspace/ui/globals.css";

import { NotificationInbox } from "@workspace/ui/components/notification-inbox";

import { toSessionUser, type RawSessionUser } from "@workspace/auth/types";
import { canAccessBoardsApp } from "@workspace/auth/boards-access";
import { AppProviders } from "@workspace/ui/components/app-providers";
import { PreviewBanner } from "@workspace/ui/components/preview-banner";
import { BoardsAmsNav } from "@/components/ams-site-nav";
import { auth } from "@/lib/auth";
import {
  getBoardsUrl,
  getCalendarUrl,
  getCrossAppSignInUrl,
  getWebUrl,
} from "@/lib/urls";
import {
  getNotificationInbox,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/_actions/notifications";

const fontSans = Unbounded({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
});

const fontCopy = Saira({
  subsets: ["latin"],
  variable: "--font-copy",
  weight: ["400", "500", "600", "700"],
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Tableros AMS — Asociación Mexicana de Speedcubing",
  description:
    "Tableros de organización de competencias de la Asociación Mexicana de Speedcubing.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tableros AMS",
  },
};

function boardsNavUrls() {
  return {
    webUrl: getWebUrl(),
    calendarUrl: getCalendarUrl(),
    boardsUrl: getBoardsUrl(),
    signInHref: getCrossAppSignInUrl(getBoardsUrl()),
  };
}

async function BoardsAmsNavWrapper() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user
    ? toSessionUser(session.user as RawSessionUser)
    : null;

  const showBoardsLink = await canAccessBoardsApp(user);
  const urls = boardsNavUrls();
  const actions =
    user != null ? (
      <div className="[&_button]:text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
        <BoardsNavNotifications />
      </div>
    ) : null;

  return (
    <BoardsAmsNav
      user={
        user
          ? {
              name: user.name,
              image: user.image,
              email: user.email,
            }
          : null
      }
      showBoardsLink={showBoardsLink}
      actions={actions}
      {...urls}
    />
  );
}

async function BoardsNavNotifications() {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const urls = boardsNavUrls();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontCopy.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <AppProviders>
          <div className="flex h-svh flex-col overflow-hidden">
            <div className="z-40 shrink-0">
              <Suspense fallback={null}>
                <PreviewBanner productionHost="tablero.amscubing.org" />
              </Suspense>
              <Suspense fallback={<BoardsAmsNav user={null} {...urls} />}>
                <BoardsAmsNavWrapper />
              </Suspense>
            </div>
            <main className="flex min-h-0 flex-1 flex-col overflow-auto">
              {children}
            </main>
          </div>
          <Analytics />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
