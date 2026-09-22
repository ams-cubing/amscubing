import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { requireDelegate } from "@/lib/session";

import { getOpenDateRequestsForDelegate } from "./_lib/queries";

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DateRequestsListPage() {
  const authResult = await requireDelegate();
  if (!authResult.ok || !authResult.session.user.wcaId) {
    notFound();
  }

  const requests = await getOpenDateRequestsForDelegate(
    authResult.session.user.wcaId,
  );

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Solicitudes de fecha
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Propuestas pendientes de tu confirmación. La competencia se crea al
            aceptar.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-card border rounded-lg p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              No tienes solicitudes pendientes.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => {
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
                <li
                  key={request.id}
                  className="bg-card border rounded-lg p-4 md:p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold truncate">
                          {request.city}
                        </h2>
                        <Badge variant="secondary">Pendiente</Badge>
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
                        <p className="text-xs text-muted-foreground">
                          Solicitada por {request.requester.name}
                        </p>
                      )}
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/panel/solicitudes-fecha/${request.id}`}>
                        Revisar
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
