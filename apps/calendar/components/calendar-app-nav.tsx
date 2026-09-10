"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Moon,
  PlusCircle,
  Sun,
  UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Suspense, type ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

const CALENDAR_LINKS = [
  { name: "Inicio", href: "/" },
  { name: "Regiones", href: "/regiones" },
  { name: "Solicitar fecha", href: "/solicitar-fecha" },
] as const;

const DELEGATE_LINKS = [
  { name: "Panel de delegado", href: "/panel", icon: UserIcon },
  {
    name: "Nueva competencia",
    href: "/panel/competencias/nueva",
    icon: PlusCircle,
  },
  {
    name: "Disponibilidad",
    href: "/panel/disponibilidad",
    icon: CalendarCheck,
  },
  { name: "Feriados", href: "/panel/feriados", icon: CalendarDays },
  { name: "Actividad", href: "/panel/actividad", icon: Activity },
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
}: {
  href: string;
  label: string;
  active: boolean;
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
    </Link>
  );
}

type CalendarAppNavProps = {
  isSignedIn?: boolean;
  isDelegate?: boolean;
  notifications?: ReactNode;
};

function CalendarAppNavShell({
  isSignedIn = false,
  isDelegate = false,
  notifications,
  pathname,
}: CalendarAppNavProps & {
  pathname: string | null;
}) {
  const activePath = pathname ?? "";
  const delegateActive =
    pathname != null &&
    DELEGATE_LINKS.some((item) => isActivePath(pathname, item.href));

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
              active={
                pathname != null && isActivePath(activePath, item.href)
              }
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    delegateActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                  )}
                >
                  Delegado
                  <ChevronDown className="size-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-52">
                {DELEGATE_LINKS.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <item.icon />
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
