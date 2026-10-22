"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const ROOT = "/panel/equipo";
const UNITS = "/panel/equipo/unidades";

const LINKS: { name: string; href: Route }[] = [
  { name: "Resumen", href: ROOT },
  { name: "Unidades", href: UNITS },
  { name: "Guardianes", href: "/panel/equipo/guardianes" },
  { name: "Solicitudes", href: "/panel/equipo/solicitudes" },
  { name: "Préstamos", href: "/panel/equipo/prestamos" },
  { name: "Adquisiciones", href: "/panel/equipo/adquisiciones" },
  { name: "Actividad", href: "/panel/equipo/actividad" },
];

const SECTIONS = LINKS.slice(2);

const matches = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

function isActive(pathname: string, href: string) {
  if (href === ROOT) return pathname === ROOT;
  if (href === UNITS) {
    return (
      pathname.startsWith(`${ROOT}/`) &&
      !SECTIONS.some((link) => matches(pathname, link.href))
    );
  }
  return matches(pathname, href);
}

export function EquipmentNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Equipo" className="flex flex-wrap gap-2">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            isActive(pathname, link.href)
              ? "bg-foreground text-background border-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );
}
