"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const LINKS: { name: string; href: Route }[] = [
  { name: "Inventario", href: "/panel/equipo" },
  { name: "Préstamos", href: "/panel/equipo/prestamos" },
  { name: "Adquisiciones", href: "/panel/equipo/adquisiciones" },
  { name: "Actividad", href: "/panel/equipo/actividad" },
];

function isActive(pathname: string, href: string) {
  if (href === "/panel/equipo") {
    return (
      pathname === href ||
      (pathname.startsWith("/panel/equipo/") &&
        !LINKS.slice(1).some((link) => pathname.startsWith(link.href)))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
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
