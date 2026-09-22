"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Suspense, type ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { isDelegatePanelPath } from "@/lib/delegate-panel-nav";

const CALENDAR_LINKS = [
  { name: "Inicio", href: "/" },
  { name: "Regiones", href: "/regiones" },
  { name: "Solicitar fecha", href: "/solicitar-fecha" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggleButton() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme === "system") {
      setTheme("light");
    }
  }, [theme, setTheme]);

  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="size-9 text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
    >
      {mounted && isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}

function NavLink({
  href,
  label,
  active,
  badgeCount,
}: {
  href: string;
  label: string;
  active: boolean;
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
      )}
    >
      {label}
      {badgeCount != null && badgeCount > 0 ? (
        <span
          className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground"
          aria-label={`${badgeCount} pendientes`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

type CalendarAppNavProps = {
  isSignedIn?: boolean;
  isDelegate?: boolean;
  delegateBadgeCount?: number;
  notifications?: ReactNode;
};

function CalendarAppNavShell({
  isSignedIn = false,
  isDelegate = false,
  delegateBadgeCount = 0,
  notifications,
  pathname,
}: CalendarAppNavProps & {
  pathname: string | null;
}) {
  const activePath = pathname ?? "";

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex items-center gap-2 px-4 py-2 md:gap-3 md:px-5">
        <nav
          aria-label="Calendario"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CALENDAR_LINKS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.name}
              active={pathname != null && isActivePath(activePath, item.href)}
            />
          ))}
          {isSignedIn ? (
            <NavLink
              href="/mis-competencias"
              label="Mis competencias"
              active={
                pathname != null &&
                isActivePath(activePath, "/mis-competencias")
              }
            />
          ) : null}
          {isDelegate ? (
            <NavLink
              href="/panel"
              label="Panel"
              active={pathname != null && isDelegatePanelPath(activePath)}
              badgeCount={delegateBadgeCount}
            />
          ) : null}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {notifications}
          <ThemeToggleButton />
        </div>
      </div>
    </div>
  );
}

function CalendarAppNavWithPath(props: CalendarAppNavProps) {
  const pathname = usePathname() ?? "/";
  return <CalendarAppNavShell {...props} pathname={pathname} />;
}

export function CalendarAppNav(props: CalendarAppNavProps) {
  return (
    <Suspense fallback={<CalendarAppNavShell {...props} pathname={null} />}>
      <CalendarAppNavWithPath {...props} />
    </Suspense>
  );
}
