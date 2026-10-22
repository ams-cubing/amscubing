import type { Route } from "next";
import Link from "next/link";
import { FileDown, PackagePlus, Wrench } from "lucide-react";

import {
  EQUIPMENT_REQUEST_STATUS_LABELS,
  type EquipmentRequestStatus,
} from "@workspace/db/equipment-labels";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { formatEquipmentDateTime } from "@/lib/equipment-format";

import { LoanStatusBadge } from "../../../equipo/_components/badges";
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
  const { request, loans } = sheet;
  const canLend = request && request.status !== "cancelled";

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
            equipo de competencia» del tablero.
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

      {loans.length > 0 ? (
        <ul className="divide-y rounded-lg border text-sm">
          {loans.map((loan) => (
            <li
              key={loan.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <div className="min-w-0">
                <Link
                  prefetch={false}
                  href={`/panel/equipo/prestamos/${loan.id}` as Route}
                  className="font-medium hover:underline"
                >
                  Préstamo #{loan.id}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {loan.summary} · presta {loan.lentBy.name} · recibe{" "}
                  {loan.borrower.name}
                </p>
              </div>
              <LoanStatusBadge status={loan.status} />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {canLend ? (
          <Button asChild size="sm">
            <Link
              prefetch={false}
              href={
                `/panel/equipo/prestamos/nuevo?solicitud=${request.id}` as Route
              }
            >
              <PackagePlus className="size-4" />
              {loans.length > 0 ? "Otro préstamo" : "Preparar préstamo"}
            </Link>
          </Button>
        ) : null}
        {request || loans.length > 0 ? (
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
        {request &&
        (request.status === "draft" || request.status === "submitted") ? (
          <CancelRequestForm requestId={request.id} />
        ) : null}
      </div>
    </section>
  );
}
