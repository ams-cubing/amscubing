import { Geist_Mono, Saira, Unbounded } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

import "@workspace/ui/globals.css";

import { canAccessBoardsApp } from "@workspace/auth/boards-access";
import { AmsAppNav } from "@workspace/ui/components/ams-app-nav";
import { AmsAppSubnav } from "@workspace/ui/components/ams-app-subnav";
import { AmsHeaderNotifications } from "@workspace/ui/components/ams-header-notifications";
import { AmsSiteFooter } from "@workspace/ui/components/ams-site-footer";
import { AppProviders } from "@workspace/ui/components/app-providers";
import { PreviewBanner } from "@workspace/ui/components/preview-banner";
import { signOutAction } from "@/app/_actions/auth";
import {
  getNotificationInbox,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/_actions/notifications";
import { getViewer, signInUrl } from "@/lib/auth";
import {
  getBlogUrl,
  getBoardsUrl,
  getCalendarUrl,
  getCoursesUrl,
  getWebUrl,
} from "@/lib/urls";

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

const description = "Historias, guías y comunidad de speedcubing en México.";

export const metadata = {
  metadataBase: new URL(getBlogUrl()),
  title: { default: "Blog AMS", template: "%s | Blog AMS" },
  description,
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
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Blog AMS",
    title: "Blog AMS",
    description,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "AMS" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Blog AMS",
  },
};

function navUrls() {
  return {
    webUrl: getWebUrl(),
    calendarUrl: getCalendarUrl(),
    boardsUrl: getBoardsUrl(),
    coursesUrl: getCoursesUrl(),
    signInHref: signInUrl(),
  };
}

const publicLinks = [{ label: "Explorar", href: "/" }];

async function BlogNav() {
  const viewer = await getViewer();
  return (
    <AmsAppNav
      active="Blog"
      user={
        viewer
          ? { name: viewer.name, image: viewer.image, email: viewer.email }
          : null
      }
      showBoardsLink={await canAccessBoardsApp(viewer)}
      actions={
        viewer ? (
          <AmsHeaderNotifications
            getInbox={getNotificationInbox}
            onMarkRead={markNotificationReadAction}
            onMarkAllRead={markAllNotificationsReadAction}
          />
        ) : null
      }
      urls={navUrls()}
      onSignOut={signOutAction}
    />
  );
}

async function BlogSubnav() {
  const viewer = await getViewer();
  return (
    <AmsAppSubnav
      title="Blog AMS"
      label="Navegación del blog"
      links={[
        ...publicLinks,
        ...(viewer?.canManage
          ? [{ label: "Administrar", href: "/admin" }]
          : []),
      ]}
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
        className={`${fontSans.variable} ${fontCopy.variable} ${fontMono.variable} ams-copy bg-ams-soft text-lg leading-relaxed text-ams-navy antialiased`}
      >
        <AppProviders>
          <Suspense fallback={null}>
            <PreviewBanner productionHost="blog.amscubing.org" />
          </Suspense>
          <Suspense
            fallback={<AmsAppNav active="Blog" user={null} urls={navUrls()} />}
          >
            <BlogNav />
          </Suspense>
          <Suspense
            fallback={
              <AmsAppSubnav
                title="Blog AMS"
                label="Navegación del blog"
                links={publicLinks}
              />
            }
          >
            <BlogSubnav />
          </Suspense>
          <main>{children}</main>
          <AmsSiteFooter
            webUrl={getWebUrl()}
            calendarUrl={getCalendarUrl()}
            blogUrl={getBlogUrl()}
            coursesUrl={getCoursesUrl()}
          />
          <Analytics />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
