import type { Route } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { EquipmentRequestListRow } from "@workspace/db/equipment";
import { Button } from "@workspace/ui/components/button";

import {
  formatEquipmentDate,
  formatEquipmentDateTime,
} from "@/lib/equipment-format";

import {
  getConfirmedEquipmentRequests,
  getOpenEquipmentRequests,
} from "../_lib/queries";
import Loading from "./loading";

function RequestList({
  requests,
  action,
  variant,
}: {
  requests: EquipmentRequestListRow[];
  action: string;
  variant?: "outline";
}) {
  return (
    <ul className="divide-y rounded-lg border">
      {requests.map((request) => (
        <li
          key={request.id}
          className="flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div className="min-w-0 space-y-1">
            <Link
              prefetch={false}
              href={`/panel/competencias/${request.competition.id}` as Route}
              className="font-medium hover:underline"
            >
              {request.competition.name ?? request.competition.city}
            </Link>
            <p className="text-muted-foreground text-xs">
              {formatEquipmentDate(request.competition.startDate)} ·{" "}
              {request.requestedBy?.name ?? "Organizador"}
              {request.submittedAt
                ? ` · enviada ${formatEquipmentDateTime(request.submittedAt)}`
                : null}
              {request.confirmedBy
                ? ` · confirmó ${request.confirmedBy.name}`
                : null}
            </p>
            <p className="text-sm">{request.summary || "Sin renglones"}</p>
          </div>
          <Button asChild size="sm" variant={variant}>
            <Link
              prefetch={false}
              href={`/panel/equipo/solicitudes/${request.id}` as Route}
            >
              {action}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

async function PageContent() {
  await connection();
  const [open, confirmed] = await Promise.all([
    getOpenEquipmentRequests(),
    getConfirmedEquipmentRequests(),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Por confirmar</h2>
        {open.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay solicitudes pendientes. Los organizadores las envían desde la
            tarjeta «Confirmación de equipo de competencia» de su tablero.
          </p>
        ) : (
          <RequestList requests={open} action="Confirmar equipo" />
        )}
      </section>

      {confirmed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Confirmadas</h2>
          <p className="text-muted-foreground text-sm">
            Su equipo está reservado hasta que termine la competencia.
          </p>
          <RequestList
            requests={confirmed}
            action="Editar confirmación"
            variant="outline"
          />
        </section>
      ) : null}
    </div>
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Solicitudes</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Equipo que los organizadores pidieron para sus competencias. El
          delegado confirma los SKUs que llevará; el equipo no se presta, se
          queda con su guardián.
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent />
      </Suspense>
    </div>
  );
}
