import { Unbounded, Saira, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import "@workspace/ui/globals.css";
import "leaflet/dist/leaflet.css";
import { toSessionUser, type RawSessionUser } from "@workspace/auth/types";
import { AppProviders } from "@workspace/ui/components/app-providers";
import { PreviewBanner } from "@workspace/ui/components/preview-banner";
import { CalendarAppNav } from "@/components/calendar-app-nav";
import { AmsAppNav } from "@workspace/ui/components/ams-app-nav";
import { AmsHeaderNotifications } from "@workspace/ui/components/ams-header-notifications";
import { getCoursesUrl } from "@workspace/auth/urls";
import { signOutAction } from "@/app/_actions/auth";
import {
  getNotificationInbox,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/_actions/notifications";
import { Toaster } from "sonner";
import { Footer } from "@/components/footer";
import { getDelegatePanelBadges } from "@/lib/delegate-panel-badges";
import { auth } from "@/lib/auth";
import { canSeeBoardsNav } from "@/lib/boards";
import {
  getBoardsUrl,
  getCalendarUrl,
  getCrossAppSignInUrl,
  getWebUrl,
} from "@/lib/urls";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  title: "Calendario Público - Asociación Mexicana de Speedcubing",
  description:
    "Consulta y gestiona las competencias de speedcubing en México con el calendario público de la Asociación Mexicana de Speedcubing.",
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
    title: "AMS Calendario",
  },
};

async function CalendarAppNavWrapper() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  const normalizedUser = session?.user
    ? toSessionUser(session.user as RawSessionUser)
    : null;

  const isDelegate = normalizedUser?.role === "delegate";
  const delegateBadgeCount =
    isDelegate && normalizedUser?.wcaId
      ? (await getDelegatePanelBadges(normalizedUser.wcaId)).total
      : 0;

  return (
    <CalendarAppNav
      isSignedIn={normalizedUser != null}
      isDelegate={isDelegate}
      delegateBadgeCount={delegateBadgeCount}
    />
  );
}

function calendarNavUrls() {
  const calendarUrl = getCalendarUrl();
  return {
    webUrl: getWebUrl(),
    calendarUrl,
    boardsUrl: getBoardsUrl(),
    coursesUrl: getCoursesUrl(),
    signInHref: getCrossAppSignInUrl(calendarUrl),
  };
}

async function CalendarAmsNavWrapper() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  const normalizedUser = session?.user
    ? toSessionUser(session.user as RawSessionUser)
    : null;

  return (
    <AmsAppNav
      user={
        normalizedUser
          ? {
              name: normalizedUser.name,
              image: normalizedUser.image,
              email: normalizedUser.email,
            }
          : null
      }
      showBoardsLink={await canSeeBoardsNav(normalizedUser)}
      actions={
        normalizedUser != null ? (
          <AmsHeaderNotifications
            getInbox={getNotificationInbox}
            onMarkRead={markNotificationReadAction}
            onMarkAllRead={markAllNotificationsReadAction}
          />
        ) : null
      }
      urls={calendarNavUrls()}
      onSignOut={signOutAction}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontCopy.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <AppProviders nuqs>
          <Suspense fallback={null}>
            <PreviewBanner productionHost="calendario.amscubing.org" />
          </Suspense>
          <Suspense
            fallback={<AmsAppNav user={null} urls={calendarNavUrls()} />}
          >
            <CalendarAmsNavWrapper />
          </Suspense>
          <div className="sticky top-0 z-40">
            <Suspense
              fallback={
                <CalendarAppNav isSignedIn={false} isDelegate={false} />
              }
            >
              <CalendarAppNavWrapper />
            </Suspense>
          </div>
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {children}
            </div>
          </div>
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
          <Analytics />
          <SpeedInsights />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
