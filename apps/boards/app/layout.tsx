import { Rubik, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

import "@workspace/ui/globals.css";

import { NotificationInbox } from "@workspace/ui/components/notification-inbox";

import { Providers } from "@/components/providers";
import { PreviewBanner } from "@/components/preview-banner";
import { SignInButton } from "@/components/sign-in-button";
import { UserMenu } from "@/components/user-menu";
import { auth } from "@/lib/auth";
import { getCalendarUrl } from "@/lib/urls";
import {
  getNotificationInbox,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/_actions/notifications";

const fontSans = Rubik({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Tableros AMS — Asociación Mexicana de Speedcubing",
  description:
    "Tableros de organización de competencias de la Asociación Mexicana de Speedcubing.",
};

async function HeaderAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
        wcaId: session.user.wcaId,
        role: session.user.role as "delegate" | "user",
        regionId: session.user.regionId ?? null,
        delegateTitle: session.user.delegateTitle ?? null,
        delegateLocation: session.user.delegateLocation ?? null,
        lastLogin: session.user.lastLogin ?? null,
      }
    : null;

  if (!user) {
    return <SignInButton />;
  }

  const inbox = await getNotificationInbox();

  return (
    <div className="flex items-center gap-1">
      <NotificationInbox
        items={inbox.items}
        unreadCount={inbox.unreadCount}
        onMarkRead={markNotificationReadAction}
        onMarkAllRead={markAllNotificationsReadAction}
        onRefresh={getNotificationInbox}
      />
      <UserMenu user={user} />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const calendarUrl = getCalendarUrl();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <Providers>
          <div className="flex h-svh flex-col overflow-hidden">
            <header className="z-40 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
              <Suspense fallback={null}>
                <PreviewBanner productionHost="tablero.amscubing.org" />
              </Suspense>
              <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-4">
                <div className="flex items-center gap-4">
                  <Link href="/" className="font-semibold tracking-tight">
                    Tableros AMS
                  </Link>
                  <Link
                    href={calendarUrl}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Calendario
                  </Link>
                </div>
                <Suspense fallback={null}>
                  <HeaderAuth />
                </Suspense>
              </div>
            </header>
            <main className="flex min-h-0 flex-1 flex-col overflow-auto">
              {children}
            </main>
          </div>
          <Analytics />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
