import { Rubik, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "@workspace/ui/globals.css";
import "./web.css";

const fontSans = Rubik({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Asociación Mexicana de Speedcubing",
  description:
    "Comunidad que promueve el speedcubing en México: competencias, compañerismo y crecimiento personal en apego a la WCA.",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
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
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
