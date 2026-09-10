"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";

import { SiteNavAccount } from "@/components/site-nav-account";

const navItems = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Competencias", href: "/competencias" },
  { label: "Blog", href: "/blog" },
  { label: "Cursos", href: "/cursos" },
] as const;

export function SiteNav({
  active = "Inicio",
}: {
  active?: (typeof navItems)[number]["label"];
}) {
  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b-[3px] border-ams-red bg-ams-navy">
      <nav
        className="ams-container flex items-center gap-5 py-4 lg:gap-9"
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        <Link href="/" className="flex flex-none items-center gap-2 text-white">
          <Image
            src="/source/isotipo-color-sm.png"
            alt=""
            width={42}
            height={24}
            className="h-8 w-auto"
            priority
          />
          <span className="ams-display text-xl leading-none">AMS</span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-bold text-white/90 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={active} />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Button
            asChild
            className="ams-glass hidden border border-white/25 md:inline-flex"
          >
            <Link href="/competencias">Regístrate a una competencia</Link>
          </Button>
          <SiteNavAccount />
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
                {navItems.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <NavLink item={item} active={active} mobile />
                  </SheetClose>
                ))}
                <div className="mt-3 grid gap-3">
                  <SheetClose asChild>
                    <Button
                      asChild
                      className="ams-glass border border-white/25"
                    >
                      <Link href="/competencias">
                        Regístrate a una competencia
                      </Link>
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
  item,
  active,
  mobile = false,
}: {
  item: (typeof navItems)[number];
  active: (typeof navItems)[number]["label"];
  mobile?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`font-bold transition-colors hover:text-ams-orange ${
        mobile ? "rounded-xl px-3 py-3 text-base" : "text-sm"
      } ${active === item.label ? "text-ams-orange" : "text-white/90"}`}
    >
      {item.label}
    </Link>
  );
}
