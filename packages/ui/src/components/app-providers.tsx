"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function AppProviders({
  children,
  nuqs = false,
}: {
  children: React.ReactNode;
  nuqs?: boolean;
}) {
  const content = nuqs ? <NuqsAdapter>{children}</NuqsAdapter> : children;

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      {content}
    </NextThemesProvider>
  );
}
