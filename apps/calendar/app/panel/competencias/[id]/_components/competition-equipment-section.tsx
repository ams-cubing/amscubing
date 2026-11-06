import type { Route } from "next";
import Link from "next/link";
import { FileDown, PackageCheck, Wrench } from "lucide-react";

import { todayInMexico } from "@workspace/db/equipment";
import {
  EQUIPMENT_REQUEST_STATUS_LABELS,
  type EquipmentRequestStatus,
} from "@workspace/db/equipment-labels";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { formatEquipmentDateTime } from "@/lib/equipment-format";

import { CancelRequestForm } from "../../../equipo/_components/cancel-request-form";
import { getCompetitionEquipment } from "../../../equipo/_lib/queries";

const REQUEST_BADGE_CLASSES: Record<EquipmentRequestStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700 border-zinc-200",
  submitted: "bg-amber-100 text-amber-900 border-amber-200",
  fulfilled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export async function CompetitionEquipmentSection({
  competitionId,
}: {
  competitionId: number;
}) {
  const sheet = await getCompetitionEquipment(competitionId);
  if (!sheet) return null;
  const { request, confirmation } = sheet;
  const ended = sheet.competition.endDate < todayInMexico();
  const canConfirm =
    !ended &&
    request &&
    (request.status === "submitted" || request.status === "fulfilled");

  return (
    <section className="bg-card space-y-4 rounded-lg border p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Wrench className="size-4" />
            Equipo
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Los organizadores piden el equipo desde la tarjeta «Confirmación de
            equipo de competencia» del tablero y el delegado confirma lo que
            llevará.
          </p>
        </div>
        {request ? (
          <Badge
            variant="outline"
            className={cn(REQUEST_BADGE_CLASSES[request.status])}
          >
            {EQUIPMENT_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        ) : null}
      </div>

      {request ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium">{request.summary || "Sin renglones"}</p>
          {request.notes ? (
            <p className="text-muted-foreground whitespace-pre-line rounded-md bg-muted/50 p-3 text-xs">
              {request.notes}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            {request.requestedBy ? `${request.requestedBy.name} · ` : null}
            {request.submittedAt
              ? `Enviada ${formatEquipmentDateTime(request.submittedAt)}`
              : `Actualizada ${formatEquipmentDateTime(request.updatedAt)}`}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Los organizadores aún no han solicitado equipo.
        </p>
      )}

      {ended && !confirmation && request ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          La competencia ya terminó; ya no se puede confirmar equipo ni generar
          la ficha.
        </p>
      ) : null}

      {confirmation ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Confirmado
            {confirmation.confirmedBy
              ? ` por ${confirmation.confirmedBy.name}`
              : null}
            {confirmation.confirmedAt
              ? ` · ${formatEquipmentDateTime(confirmation.confirmedAt)}`
              : null}
            {ended ? null : " · reservado hasta que termine la competencia"}
          </p>
          <ul className="divide-y rounded-lg border text-sm">
            {confirmation.lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span>
                  {line.typeName}{" "}
                  {line.sku ? (
                    <Link
                      prefetch={false}
                      href={
                        `/panel/equipo/${encodeURIComponent(line.sku)}` as Route
                      }
                      className="font-mono text-xs hover:underline"
                    >
                      {line.sku}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground font-mono text-xs">
                      × {line.quantity}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  Lo lleva {line.guardian.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {canConfirm ? (
          <Button asChild size="sm">
            <Link
              prefetch={false}
              href={`/panel/equipo/solicitudes/${request.id}` as Route}
            >
              <PackageCheck className="size-4" />
              {confirmation ? "Editar confirmación" : "Confirmar equipo"}
            </Link>
          </Button>
        ) : null}
        {confirmation ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={`/panel/competencias/${competitionId}/equipo/ficha`}
              target="_blank"
              rel="noreferrer"
            >
              <FileDown className="size-4" />
              Descargar ficha (PDF)
            </a>
          </Button>
        ) : null}
        {request && request.status !== "cancelled" && !ended ? (
          <CancelRequestForm requestId={request.id} />
        ) : null}
      </div>
    </section>
  );
}
