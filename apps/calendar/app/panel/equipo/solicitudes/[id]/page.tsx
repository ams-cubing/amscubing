import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { todayInMexico } from "@workspace/db/equipment";
import { EQUIPMENT_REQUEST_STATUS_LABELS } from "@workspace/db/equipment-labels";

import {
  formatEquipmentDate,
  formatEquipmentDateTime,
} from "@/lib/equipment-format";

import { ConfirmationForm } from "../../_components/confirmation-form";
import { getRequestForConfirmation } from "../../_lib/queries";
import Loading from "../loading";

type Params = Promise<{ id: string }>;

async function PageContent({ params }: { params: Params }) {
  await connection();
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) notFound();
  const data = await getRequestForConfirmation(requestId);
  if (!data) notFound();

  const { request, sheet } = data;
  const label = sheet.competition.name?.trim() || sheet.competition.city;
  const ended = sheet.competition.endDate < todayInMexico();
  const closed = request.status === "cancelled" || request.status === "draft";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Confirmar equipo</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          <Link
            prefetch={false}
            href={`/panel/competencias/${sheet.competition.id}` as Route}
            className="font-medium hover:underline"
          >
            {label}
          </Link>{" "}
          · {formatEquipmentDate(sheet.competition.startDate)} ·{" "}
          {EQUIPMENT_REQUEST_STATUS_LABELS[request.status]}
        </p>
      </div>

      <section className="bg-muted/50 space-y-1 rounded-lg border p-4 text-sm">
        <p className="font-medium">Solicitud de los organizadores</p>
        <p>{request.summary || "Sin renglones"}</p>
        {request.notes ? (
          <p className="text-muted-foreground whitespace-pre-line text-xs">
            {request.notes}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {request.requestedBy ? `${request.requestedBy.name} · ` : null}
          {request.submittedAt
            ? `Enviada ${formatEquipmentDateTime(request.submittedAt)}`
            : `Actualizada ${formatEquipmentDateTime(request.updatedAt)}`}
        </p>
      </section>

      {closed || ended ? (
        <p className="text-muted-foreground text-sm">
          {ended
            ? "La competencia ya terminó; la confirmación ya no se puede editar."
            : request.status === "cancelled"
              ? "La solicitud fue cancelada."
              : "Los organizadores aún no envían la solicitud."}
        </p>
      ) : (
        <ConfirmationForm
          requestId={request.id}
          requested={Object.fromEntries(
            request.lines.map((line) => [line.typeId, line.quantity]),
          )}
          existing={sheet.confirmation?.lines ?? []}
          delegateIds={data.delegateIds}
          types={data.types}
          items={data.items}
          stock={data.stock}
          guardians={data.guardians}
        />
      )}
    </div>
  );
}

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent params={params} />
    </Suspense>
  );
}
