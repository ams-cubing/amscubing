import { Rubik, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import "leaflet/dist/leaflet.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  const user = session?.user;

  const normalizedUser = user
    ? {
        ...user,
        image: user.image ?? null,
        regionId: user.regionId ?? null,
        lastLogin: user.lastLogin ?? null,
      }
    : undefined;

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <Providers>
          <SidebarProvider>
            <AppSidebar user={normalizedUser} />
            <SidebarInset>
              <Header />
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                  {children}
                </div>
              </div>
              <Footer />
            </SidebarInset>
          </SidebarProvider>
          <Analytics />
          <SpeedInsights />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
