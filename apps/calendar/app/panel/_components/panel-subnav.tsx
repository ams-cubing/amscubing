"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

import {
  badgeCountForLink,
  DELEGATE_PANEL_LINKS,
  isDelegatePanelLinkActive,
  type DelegatePanelBadges,
} from "@/lib/delegate-panel-nav";

export function PanelSubnav({ badges }: { badges: DelegatePanelBadges }) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Panel de delegado"
      className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-border pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Link
        href="/panel"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
          pathname === "/panel"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
        )}
      >
        Inicio
      </Link>
      {DELEGATE_PANEL_LINKS.map((item) => {
        const count = badgeCountForLink(badges, item.badgeKey);
        const active = isDelegatePanelLinkActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5 opacity-70" />
            {item.name}
            {count > 0 ? (
              <span
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground"
                aria-label={`${count} pendientes`}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
