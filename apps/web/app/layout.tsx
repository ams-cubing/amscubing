import { Geist_Mono, Saira, Unbounded } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "@workspace/ui/globals.css";
import "./web.css";

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
  title: "Asociación Mexicana de Speedcubing",
  description:
    "Comunidad que promueve el speedcubing en México: competencias, compañerismo y crecimiento personal en apego a la WCA.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_WEB_URL ?? "https://amscubing.org",
  ),
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
    siteName: "Asociación Mexicana de Speedcubing",
    title: "Asociación Mexicana de Speedcubing",
    description:
      "Comunidad que promueve el speedcubing en México: competencias, compañerismo y crecimiento personal en apego a la WCA.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "AMS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asociación Mexicana de Speedcubing",
    description:
      "Comunidad que promueve el speedcubing en México: competencias, compañerismo y crecimiento personal en apego a la WCA.",
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AMS",
  },
};

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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
