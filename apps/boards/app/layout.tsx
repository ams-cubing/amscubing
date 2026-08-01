import { Rubik, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

import "@workspace/ui/globals.css";

import { Providers } from "@/components/providers";
import { SignInButton } from "@/components/sign-in-button";
import { UserMenu } from "@/components/user-menu";
import { auth } from "@/lib/auth";
import { getCalendarUrl } from "@/lib/urls";

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
        lastLogin: session.user.lastLogin ?? null,
      }
    : null;

  return user ? <UserMenu user={user} /> : <SignInButton />;
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
          <div className="flex min-h-svh flex-col">
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
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
            <main className="flex flex-1 flex-col">{children}</main>
          </div>
          <Analytics />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
