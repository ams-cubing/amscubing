"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Torneos", href: "/torneos" },
  { label: "Blog", href: "/blog" },
  { label: "Cursos", href: "/cursos" },
] as const;

export function SiteNav({
  active = "Home",
}: {
  active?: (typeof navItems)[number]["label"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b-[3px] border-[var(--ams-red)] bg-[var(--ams-navy)]">
      <nav
        className="ams-container flex items-center gap-5 py-4 lg:gap-9"
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        <Link
          href="/"
          className="flex flex-none items-center gap-2 text-white"
          onClick={() => setOpen(false)}
        >
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
            <NavLink
              key={item.href}
              item={item}
              active={active}
              onClick={() => setOpen(false)}
            />
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            href="/torneos"
            className="ams-glass rounded-full border border-white/25 bg-[linear-gradient(135deg,rgba(0,154,68,0.9),rgba(0,154,68,0.62))] px-5 py-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(0,154,68,0.3)]"
          >
            Regístrate a un torneo
          </Link>
          <Link
            href="/cuenta"
            className="ams-glass rounded-full border border-white/25 bg-[linear-gradient(135deg,rgba(186,12,47,0.95),rgba(186,12,47,0.66))] px-4 py-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(186,12,47,0.28)]"
          >
            Iniciar sesión
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="ams-glass ml-auto inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open ? (
        <div
          className="border-t border-white/10 bg-[var(--ams-navy)] px-4 pb-5 pt-2 text-white md:hidden"
          style={{ fontFamily: "var(--font-sans), sans-serif" }}
        >
          <div className="mx-auto grid w-[min(100%,1400px)] gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={active}
                onClick={() => setOpen(false)}
                mobile
              />
            ))}
            <div className="mt-3 grid gap-3">
              <Link
                href="/torneos"
                onClick={() => setOpen(false)}
                className="ams-glass rounded-full border border-white/25 bg-[linear-gradient(135deg,rgba(0,154,68,0.9),rgba(0,154,68,0.62))] px-5 py-3 text-center text-sm font-bold text-white shadow-[0_6px_16px_rgba(0,154,68,0.3)]"
              >
                Regístrate a un torneo
              </Link>
              <Link
                href="/cuenta"
                onClick={() => setOpen(false)}
                className="ams-glass rounded-full border border-white/25 bg-[linear-gradient(135deg,rgba(186,12,47,0.95),rgba(186,12,47,0.66))] px-5 py-3 text-center text-sm font-bold text-white shadow-[0_6px_16px_rgba(186,12,47,0.28)]"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({
  item,
  active,
  mobile = false,
  onClick,
}: {
  item: (typeof navItems)[number];
  active: (typeof navItems)[number]["label"];
  mobile?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`font-bold transition-colors hover:text-[var(--ams-orange)] ${
        mobile ? "rounded-xl px-3 py-3 text-base" : "text-sm"
      } ${active === item.label ? "text-[var(--ams-orange)]" : "text-white/90"}`}
    >
      {item.label}
    </Link>
  );
}
