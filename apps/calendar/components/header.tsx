import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-ams-navy/10 bg-card">
      <div className="mx-auto flex items-center gap-3 px-4 py-3 md:gap-4 md:px-5">
        <SidebarTrigger className="text-ams-navy" />
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-ams-navy transition-colors hover:text-ams-orange md:text-base"
        >
          Calendario
        </Link>
        {children ? (
          <div className="ml-auto flex items-center">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
