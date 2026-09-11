import { Unbounded, Saira, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import "@workspace/ui/globals.css";
import "leaflet/dist/leaflet.css";
import { toSessionUser, type RawSessionUser } from "@workspace/auth/types";
import { AppProviders } from "@workspace/ui/components/app-providers";
import { PreviewBanner } from "@workspace/ui/components/preview-banner";
import { CalendarAppNav } from "@/components/calendar-app-nav";
import { HeaderNotifications } from "@/components/header-notifications";
import { CalendarAmsNav } from "@/components/ams-site-nav";
import { Toaster } from "sonner";
import { Footer } from "@/components/footer";
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

  return (
    <CalendarAppNav
      isSignedIn={normalizedUser != null}
      isDelegate={normalizedUser?.role === "delegate"}
      notifications={
        <Suspense fallback={null}>
          <HeaderNotifications />
        </Suspense>
      }
    />
  );
}

async function CalendarAmsNavWrapper() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  const normalizedUser = session?.user
    ? toSessionUser(session.user as RawSessionUser)
    : null;

  const webUrl = getWebUrl();
  const calendarUrl = getCalendarUrl();
  const boardsUrl = getBoardsUrl();

  return (
    <CalendarAmsNav
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
      signInHref={getCrossAppSignInUrl(calendarUrl)}
      webUrl={webUrl}
      calendarUrl={calendarUrl}
      boardsUrl={boardsUrl}
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
            fallback={
              <CalendarAmsNav
                user={null}
                signInHref={getCrossAppSignInUrl(getCalendarUrl())}
                webUrl={getWebUrl()}
                calendarUrl={getCalendarUrl()}
                boardsUrl={getBoardsUrl()}
              />
            }
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
