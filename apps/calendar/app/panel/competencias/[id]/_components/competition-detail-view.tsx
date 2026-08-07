import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";

import type { getCompetitionWithRelations } from "../_lib/queries";
import {
  formatInternalStatus,
  formatPublicStatus,
  getInternalStatusColor,
  getPublicStatusColor,
} from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

type CompetitionDetail = NonNullable<
  Awaited<ReturnType<typeof getCompetitionWithRelations>>
>;

function getBoardsUrl() {
  return (
    process.env.NEXT_PUBLIC_BOARDS_URL ?? "http://localhost:3002"
  ).replace(/\/$/, "");
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CompetitionDetailView({
  competition,
}: {
  competition: CompetitionDetail;
}) {
  const boardsUrl = getBoardsUrl();
  const location = [
    competition.city,
    competition.state?.name,
    competition.state?.region?.displayName
      ? `(${competition.state.region.displayName})`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            {competition.name || "Competencia sin nombre"}
          </h1>
          <p className="flex items-center gap-1.5 text-muted-foreground text-sm md:text-base">
            <MapPin className="size-4 shrink-0" />
            {location}
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground text-sm md:text-base">
            <CalendarDays className="size-4 shrink-0" />
            {formatDate(competition.startDate)}
            {competition.startDate !== competition.endDate &&
              ` – ${formatDate(competition.endDate)}`}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge
              className={cn(
                "border-transparent",
                getPublicStatusColor(competition.statusPublic),
              )}
            >
              {formatPublicStatus(competition.statusPublic)}
            </Badge>
            <Badge
              className={cn(
                "border-transparent",
                getInternalStatusColor(competition.statusInternal),
              )}
            >
              {formatInternalStatus(competition.statusInternal)}
            </Badge>
          </div>
        </div>
        <Button asChild>
          <Link href={`/panel/competencias/${competition.id}/editar`}>
            <Pencil className="size-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="bg-card border rounded-lg p-4 md:p-5 shadow-sm space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="size-4" />
            Delegados
          </h2>
          {competition.delegates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin delegados</p>
          ) : (
            <ul className="space-y-2">
              {competition.delegates.map((row) => (
                <li key={row.delegateWcaId} className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarImage src={row.delegate?.image ?? undefined} />
                    <AvatarFallback>
                      {row.delegate?.name?.slice(0, 1) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-sm">
                    <div className="font-medium truncate">
                      {row.delegate?.name ?? "Usuario"}
                      {row.isPrimary && (
                        <span className="text-muted-foreground"> ★</span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {row.delegateWcaId}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card border rounded-lg p-4 md:p-5 shadow-sm space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="size-4" />
            Organizadores
          </h2>
          {competition.organizers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin organizadores</p>
          ) : (
            <ul className="space-y-2">
              {competition.organizers.map((row) => (
                <li
                  key={row.organizerWcaId}
                  className="flex items-center gap-2"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={row.organizer?.image ?? undefined} />
                    <AvatarFallback>
                      {row.organizer?.name?.slice(0, 1) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-sm">
                    <div className="font-medium truncate">
                      {row.organizer?.name ?? "Usuario"}
                      {row.isPrimary && (
                        <span className="text-muted-foreground"> ★</span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {row.organizerWcaId}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-card border rounded-lg p-4 md:p-5 shadow-sm space-y-4">
        <h2 className="font-semibold">Detalles</h2>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Capacidad</dt>
            <dd className="font-medium">
              {competition.capacity > 0 ? competition.capacity : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Solicitada por</dt>
            <dd className="font-medium">{competition.requestedBy || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tablero asignado</dt>
            <dd className="font-medium">
              {competition.trelloAssignedAt
                ? new Date(competition.trelloAssignedAt).toLocaleString("es-MX")
                : "No asignado"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ultimátum</dt>
            <dd className="font-medium">
              {competition.ultimatumSetTo
                ? new Date(competition.ultimatumSetTo).toLocaleString("es-MX")
                : "—"}
            </dd>
          </div>
        </dl>

        {competition.notes && (
          <div className="text-sm">
            <div className="text-muted-foreground mb-1">Notas</div>
            <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3">
              {competition.notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {competition.boardId && (
            <Button asChild variant="outline" size="sm">
              <a
                href={`${boardsUrl}/boards/${competition.boardId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LayoutDashboard className="size-4" />
                Tablero AMS
              </a>
            </Button>
          )}
          {!competition.boardId && competition.trelloUrl && (
            <Button asChild variant="outline" size="sm">
              <a
                href={competition.trelloUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                Trello
              </a>
            </Button>
          )}
          {competition.wcaCompetitionUrl && (
            <Button asChild variant="outline" size="sm">
              <a
                href={competition.wcaCompetitionUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                WCA
              </a>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
