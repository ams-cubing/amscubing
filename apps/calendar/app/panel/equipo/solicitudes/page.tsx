import type { Route } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@workspace/ui/components/button";

import {
  formatEquipmentDate,
  formatEquipmentDateTime,
} from "@/lib/equipment-format";

import { getOpenEquipmentRequests } from "../_lib/queries";
import Loading from "./loading";

async function PageContent() {
  await connection();
  const requests = await getOpenEquipmentRequests();

  if (requests.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay solicitudes pendientes. Los organizadores las envían desde la
        tarjeta «Confirmación de equipo de competencia» de su tablero.
      </p>
    );
  }

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
            </p>
            <p className="text-sm">{request.summary || "Sin renglones"}</p>
          </div>
          <Button asChild size="sm">
            <Link
              prefetch={false}
              href={
                `/panel/equipo/prestamos/nuevo?solicitud=${request.id}` as Route
              }
            >
              Preparar préstamo
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Solicitudes</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Equipo que los organizadores pidieron para sus competencias y que aún
          no tiene préstamo.
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent />
      </Suspense>
    </div>
  );
}
