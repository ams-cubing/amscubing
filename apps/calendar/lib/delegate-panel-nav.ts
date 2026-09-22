import {
  Activity,
  CalendarCheck,
  CalendarDays,
  Inbox,
  PlusCircle,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type DelegatePanelBadgeKey = "solicitudesFecha" | "competencias";

export type DelegatePanelBadges = {
  solicitudesFecha: number;
  competencias: number;
  total: number;
};

export type DelegatePanelLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  badgeKey: DelegatePanelBadgeKey | null;
};

export const DELEGATE_PANEL_LINKS: readonly DelegatePanelLink[] = [
  {
    name: "Competencias",
    href: "/panel/competencias",
    icon: Trophy,
    badgeKey: "competencias",
  },
  {
    name: "Solicitudes de fecha",
    href: "/panel/solicitudes-fecha",
    icon: Inbox,
    badgeKey: "solicitudesFecha",
  },
  {
    name: "Nueva competencia",
    href: "/panel/competencias/nueva",
    icon: PlusCircle,
    badgeKey: null,
  },
  {
    name: "Disponibilidad",
    href: "/panel/disponibilidad",
    icon: CalendarCheck,
    badgeKey: null,
  },
  {
    name: "Feriados",
    href: "/panel/feriados",
    icon: CalendarDays,
    badgeKey: null,
  },
  {
    name: "Actividad",
    href: "/panel/actividad",
    icon: Activity,
    badgeKey: null,
  },
] as const;

export function isDelegatePanelPath(pathname: string) {
  return pathname === "/panel" || pathname.startsWith("/panel/");
}

export function isDelegatePanelLinkActive(pathname: string, href: string) {
  if (href === "/panel/competencias") {
    return (
      pathname === "/panel/competencias" ||
      /^\/panel\/competencias\/\d+(?:\/|$)/.test(pathname)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function badgeCountForLink(
  badges: DelegatePanelBadges,
  badgeKey: DelegatePanelBadgeKey | null,
) {
  if (!badgeKey) return 0;
  return badges[badgeKey];
}
