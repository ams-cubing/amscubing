import Link from "next/link";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { getDelegatePanelBadges } from "@/lib/delegate-panel-badges";
import { auth } from "@/lib/auth";
import {
  badgeCountForLink,
  DELEGATE_PANEL_LINKS,
} from "@/lib/delegate-panel-nav";
import { headers } from "next/headers";

export default async function PanelHubPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const wcaId = session?.user?.wcaId;
  const badges = wcaId
    ? await getDelegatePanelBadges(wcaId)
    : { solicitudesFecha: 0, competencias: 0, total: 0 };

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Panel de delegado</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Accede a competencias, solicitudes y herramientas del calendario.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DELEGATE_PANEL_LINKS.map((item) => {
          const count = badgeCountForLink(badges, item.badgeKey);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors",
                "hover:border-foreground/20 hover:bg-accent/40",
              )}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {item.name}
                  </span>
                  {count > 0 ? (
                    <Badge
                      variant="destructive"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {count > 99 ? "99+" : count}
                    </Badge>
                  ) : null}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {hubDescription(item.href)}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function hubDescription(href: string) {
  switch (href) {
    case "/panel/competencias":
      return "Revisa y administra competencias del calendario.";
    case "/panel/solicitudes-fecha":
      return "Responde solicitudes de fecha pendientes.";
    case "/panel/competencias/nueva":
      return "Crea una nueva competencia.";
    case "/panel/disponibilidad":
      return "Consulta y actualiza disponibilidad.";
    case "/panel/feriados":
      return "Administra feriados y fechas inhábiles.";
    case "/panel/actividad":
      return "Revisa el historial de actividad.";
    default:
      return "";
  }
}
