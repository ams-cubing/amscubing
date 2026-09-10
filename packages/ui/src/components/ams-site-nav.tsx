"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";

export const AMS_NAV_ITEMS = [
  { label: "Inicio", path: "/" },
  { label: "Nosotros", path: "/nosotros" },
  { label: "Competencias", path: "/competencias" },
  { label: "Blog", path: "/blog" },
  { label: "Cursos", path: "/cursos" },
] as const;

export type AmsNavItemLabel = (typeof AMS_NAV_ITEMS)[number]["label"];

function joinUrl(base: string, path = "/") {
  const normalized = base.replace(/\/$/, "");
  if (!path || path === "/") return normalized || "/";
  return `${normalized}${path.startsWith("/") ? path : `/${path}`}`;
}

export function AmsSiteNav({
  active = null,
  webUrl,
  logoSrc = "/source/isotipo-color-sm.png",
  account,
  actions,
}: {
  active?: AmsNavItemLabel | null;
  webUrl: string;
  logoSrc?: string;
  account?: ReactNode;
  /** Extra controls before account (e.g. notifications). */
  actions?: ReactNode;
}) {
  const homeHref = joinUrl(webUrl, "/");
  const competenciasHref = joinUrl(webUrl, "/competencias");

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b-[3px] border-ams-red bg-ams-navy">
      <nav
        className="ams-container flex items-center gap-5 py-4 lg:gap-9"
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        <a
          href={homeHref}
          className="flex flex-none items-center gap-2 text-white"
        >
          <img
            src={logoSrc}
            alt=""
            width={42}
            height={24}
            className="h-8 w-auto"
          />
          <span className="ams-display text-xl leading-none">AMS</span>
        </a>

        <div className="hidden items-center gap-6 text-sm font-bold text-white/90 md:flex">
          {AMS_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              href={joinUrl(webUrl, item.path)}
              label={item.label}
              active={active}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Button
            asChild
            className="ams-glass hidden border border-white/25 md:inline-flex"
          >
            <a href={competenciasHref}>Regístrate a una competencia</a>
          </Button>
          {actions}
          {account}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="glass"
                size="icon"
                aria-label="Abrir menú"
                className="size-11 md:hidden"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-white/10 bg-ams-navy text-white sm:max-w-sm [&_button]:text-white"
              style={{ fontFamily: "var(--font-sans), sans-serif" }}
            >
              <SheetHeader>
                <SheetTitle className="ams-display text-left text-white">
                  Menú
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 px-4">
                {AMS_NAV_ITEMS.map((item) => (
                  <SheetClose asChild key={item.path}>
                    <NavLink
                      href={joinUrl(webUrl, item.path)}
                      label={item.label}
                      active={active}
                      mobile
                    />
                  </SheetClose>
                ))}
                <div className="mt-3 grid gap-3">
                  <SheetClose asChild>
                    <Button
                      asChild
                      className="ams-glass border border-white/25"
                    >
                      <a href={competenciasHref}>
                        Regístrate a una competencia
                      </a>
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
  mobile = false,
}: {
  href: string;
  label: AmsNavItemLabel;
  active: AmsNavItemLabel | null | undefined;
  mobile?: boolean;
}) {
  return (
    <a
      href={href}
      className={`font-bold transition-colors hover:text-ams-orange ${
        mobile ? "rounded-xl px-3 py-3 text-base" : "text-sm"
      } ${active === label ? "text-ams-orange" : "text-white/90"}`}
    >
      {label}
    </a>
  );
}
