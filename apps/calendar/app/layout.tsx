import { Rubik, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import "@workspace/ui/globals.css";
import "leaflet/dist/leaflet.css";
import { toSessionUser, type RawSessionUser } from "@workspace/auth/types";
import { AppProviders } from "@workspace/ui/components/app-providers";
import { PreviewBanner } from "@workspace/ui/components/preview-banner";
import { Header } from "@/components/header";
import { HeaderNotifications } from "@/components/header-notifications";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@workspace/ui/components/sidebar";
import { Footer } from "@/components/footer";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fontSans = Rubik({
  subsets: ["latin"],
  variable: "--font-sans",
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
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AMS Calendario",
  },
};

async function AppSidebarWrapper() {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  const normalizedUser = session?.user
    ? toSessionUser(session.user as RawSessionUser)
    : undefined;

  return <AppSidebar user={normalizedUser} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <AppProviders nuqs>
          <SidebarProvider>
            <Suspense fallback={<AppSidebar user={undefined} />}>
              <AppSidebarWrapper />
            </Suspense>
            <SidebarInset>
              <div className="sticky top-0 z-50">
                <Suspense fallback={<div className="h-0" aria-hidden />}>
                  <PreviewBanner productionHost="calendario.amscubing.org" />
                </Suspense>
                <Header>
                  <Suspense fallback={null}>
                    <HeaderNotifications />
                  </Suspense>
                </Header>
              </div>
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                  {children}
                </div>
              </div>
              <Suspense fallback={null}>
                <Footer />
              </Suspense>
            </SidebarInset>
          </SidebarProvider>
          <Analytics />
          <SpeedInsights />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
