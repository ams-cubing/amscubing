import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, User } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { requireDelegate } from "@/lib/session";

import { getDateRequestById } from "../_lib/queries";
import { DateRequestResponseControls } from "./_components/date-request-response-controls";

type Params = Promise<{ id: string }>;

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(status: "open" | "accepted" | "exhausted") {
  switch (status) {
    case "open":
      return "Pendiente de confirmación";
    case "accepted":
      return "Aceptada";
    case "exhausted":
      return "Sin delegado disponible";
  }
}

export default async function DateRequestDetailPage({
  params,
}: {
  params: Params;
}) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    notFound();
  }

  const { id } = await params;
  const request = await getDateRequestById(Number(id));
  if (!request) {
    notFound();
  }

  const wcaId = authResult.session.user.wcaId;
  const canRespond =
    request.status === "open" &&
    request.proposedDelegateWcaId === wcaId &&
    Boolean(wcaId);

  const location = [
    request.city,
    request.state?.name,
    request.state?.region?.displayName
      ? `(${request.state.region.displayName})`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">
              Solicitud de fecha
            </h1>
            <Badge variant="secondary">{statusLabel(request.status)}</Badge>
          </div>
          <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin className="size-4 shrink-0" />
            {location}
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <CalendarDays className="size-4 shrink-0" />
            {formatDate(request.startDate)}
            {request.startDate !== request.endDate &&
              ` – ${formatDate(request.endDate)}`}
          </p>
          {request.requester && (
            <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <User className="size-4 shrink-0" />
              Solicitada por {request.requester.name} ({request.requester.wcaId}
              )
            </p>
          )}
        </div>

        {canRespond && (
          <DateRequestResponseControls dateRequestId={request.id} />
        )}

        {request.status === "accepted" && request.competitionId && (
          <Button asChild>
            <Link href={`/panel/competencias/${request.competitionId}`}>
              Ver competencia creada
            </Link>
          </Button>
        )}

        <Button asChild variant="outline">
          <Link href="/panel/solicitudes-fecha">Volver a solicitudes</Link>
        </Button>
      </div>
    </main>
  );
}
