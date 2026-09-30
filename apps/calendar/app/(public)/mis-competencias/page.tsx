import { Suspense } from "react";
import { auth } from "@/lib/auth";
import {
  getPublicStatusColor,
  formatPublicStatus,
  getInternalStatusColor,
  formatInternalStatus,
} from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import { headers } from "next/headers";
import Link from "next/link";
import { unauthorized } from "next/navigation";
import {
  getUserOrganizerCompetitionIds,
  getUserDelegateAssignments,
  getUserCompetitions,
  getUserDateRequests,
  getDelegatesForCompetitions,
  getOrganizersForCompetitions,
} from "./_lib/queries";
import Loading from "./loading";
import { getBoardsUrl } from "@/lib/urls";

function dateRequestStatusLabel(status: "open" | "accepted" | "exhausted") {
  switch (status) {
    case "open":
      return "Pendiente de confirmación";
    case "accepted":
      return "Aceptada — competencia creada";
    case "exhausted":
      return "Sin delegado disponible";
  }
}

function PastToggle({ includePast }: { includePast: boolean }) {
  return (
    <Link
      href={includePast ? "/mis-competencias" : "/mis-competencias?pasadas=1"}
      className="text-xs md:text-sm text-primary hover:underline"
    >
      {includePast ? "Ocultar pasadas" : "Mostrar pasadas"}
    </Link>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function PageContent({ searchParams }: { searchParams: SearchParams }) {
  const includePast = (await searchParams).pasadas === "1";
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    unauthorized();
  }

  const wcaId = session.user.wcaId;

  if (!wcaId) {
    return (
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground">
            Tu cuenta WCA aún no tiene un WCA ID. Cuando compitas por primera
            vez, se vinculará automáticamente al iniciar sesión y aquí verás tus
            competencias.
          </p>
        </div>
      </main>
    );
  }

  const [organizerCompetitionIds, delegateAssignments, dateRequestRows] =
    await Promise.all([
      getUserOrganizerCompetitionIds(wcaId),
      getUserDelegateAssignments(wcaId),
      getUserDateRequests(wcaId),
    ]);

  const organizerIds = new Set(organizerCompetitionIds);
  const delegateStatusByCompetition = new Map(
    delegateAssignments.map((a) => [a.competitionId, a.status]),
  );
  const competitionIds = [
    ...new Set([...organizerIds, ...delegateStatusByCompetition.keys()]),
  ];

  const pendingDateRequests = dateRequestRows.filter(
    (row) => row.status === "open" || row.status === "exhausted",
  );

  const [userCompetitions, delegates, organizers] =
    competitionIds.length > 0
      ? await Promise.all([
          getUserCompetitions(competitionIds, { includePast }),
          getDelegatesForCompetitions(competitionIds),
          getOrganizersForCompetitions(competitionIds),
        ])
      : [[], [], []];

  const delegatesByCompetition = delegates.reduce(
    (acc, delegate) => {
      if (!acc[delegate.competitionId]) {
        acc[delegate.competitionId] = [];
      }
      acc[delegate.competitionId]?.push(delegate);
      return acc;
    },
    {} as Record<number, typeof delegates>,
  );

  const organizersByCompetition = organizers.reduce(
    (acc, organizer) => {
      if (!acc[organizer.competitionId]) {
        acc[organizer.competitionId] = [];
      }
      acc[organizer.competitionId]?.push(organizer);
      return acc;
    },
    {} as Record<number, typeof organizers>,
  );

  const hasAnything =
    pendingDateRequests.length > 0 || userCompetitions.length > 0;

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tus competencias</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Solicitudes de fecha y competencias que organizas o delegas.
          </p>
        </div>

        {!hasAnything ? (
          <div className="bg-card border rounded-lg p-4 md:p-5 shadow-sm space-y-2">
            <p className="text-muted-foreground">
              {includePast
                ? "No tienes competencias ni solicitudes de fecha."
                : "No tienes competencias próximas ni solicitudes de fecha."}
            </p>
            {competitionIds.length > 0 && (
              <PastToggle includePast={includePast} />
            )}
          </div>
        ) : (
          <>
            {pendingDateRequests.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Solicitudes de fecha</h2>
                {pendingDateRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-card border rounded-lg p-4 md:p-5 shadow-sm space-y-3"
                  >
                    <div>
                      <h3 className="font-semibold text-base md:text-lg">
                        {request.city}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        {request.city}, {request.stateName} (
                        {request.regionName})
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {new Date(request.startDate).toLocaleDateString(
                          "es-MX",
                        )}{" "}
                        -{" "}
                        {new Date(request.endDate).toLocaleDateString("es-MX")}
                      </p>
                    </div>

                    {request.status === "open" &&
                      request.proposedDelegateName && (
                        <div className="text-xs md:text-sm bg-muted/50 rounded-md p-2.5">
                          <span className="font-semibold">
                            Delegado propuesto:
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {request.proposedDelegateName} (
                            {request.proposedDelegateWcaId}) · pendiente de
                            confirmación
                          </span>
                        </div>
                      )}

                    <span className="inline-flex text-xs px-2.5 py-1 rounded-md font-medium bg-amber-500/15 text-amber-800 dark:text-amber-200">
                      {dateRequestStatusLabel(request.status)}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {competitionIds.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Competencias</h2>
                  <PastToggle includePast={includePast} />
                </div>
                {userCompetitions.length === 0 && (
                  <div className="bg-card border rounded-lg p-4 md:p-5 shadow-sm">
                    <p className="text-muted-foreground text-sm">
                      No tienes competencias próximas.
                    </p>
                  </div>
                )}
                {userCompetitions.map((comp) => {
                  const compDelegates = delegatesByCompetition[comp.id] || [];
                  const compOrganizers = organizersByCompetition[comp.id] || [];
                  const isOrganizer = organizerIds.has(comp.id);
                  const delegateStatus = delegateStatusByCompetition.get(
                    comp.id,
                  );
                  return (
                    <div
                      key={comp.id}
                      className="bg-card border rounded-lg p-4 md:p-5 shadow-sm space-y-3"
                    >
                      <div>
                        <h3 className="font-semibold text-base md:text-lg">
                          {comp.name || "Competencia sin nombre"}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          {comp.city}, {comp.stateName} ({comp.regionName})
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {new Date(comp.startDate).toLocaleDateString("es-MX")}{" "}
                          - {new Date(comp.endDate).toLocaleDateString("es-MX")}
                        </p>
                      </div>

                      {compOrganizers.length > 0 && (
                        <div className="text-xs md:text-sm bg-muted/50 rounded-md p-2.5">
                          <span className="font-semibold">
                            {compOrganizers.length === 1
                              ? "Organizador:"
                              : "Organizadores:"}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {compOrganizers.map((o, i) => (
                              <span key={o.organizerWcaId}>
                                {o.organizerName} ({o.organizerWcaId})
                                {o.isPrimary && " ★"}
                                {i < compOrganizers.length - 1 && ", "}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}

                      {compDelegates.length > 0 && (
                        <div className="text-xs md:text-sm bg-muted/50 rounded-md p-2.5">
                          <span className="font-semibold">
                            {compDelegates.length === 1
                              ? "Delegado:"
                              : "Delegados:"}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {compDelegates.map((d, i) => (
                              <span key={d.delegateWcaId}>
                                {d.delegateName} ({d.delegateWcaId})
                                {d.isPrimary && " ★"}
                                {d.status === "pending" &&
                                  " · pendiente de confirmación"}
                                {i < compDelegates.length - 1 && ", "}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {isOrganizer && (
                          <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-muted text-foreground">
                            Organizador
                          </span>
                        )}
                        {delegateStatus && (
                          <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-muted text-foreground">
                            {delegateStatus === "pending"
                              ? "Delegado · pendiente"
                              : "Delegado"}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-md font-medium",
                            getPublicStatusColor(comp.statusPublic),
                          )}
                        >
                          {formatPublicStatus(comp.statusPublic)}
                        </span>
                        <span
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-md font-medium",
                            getInternalStatusColor(comp.statusInternal),
                          )}
                        >
                          {formatInternalStatus(comp.statusInternal)}
                        </span>
                      </div>

                      {comp.boardId ? (
                        <a
                          href={`${getBoardsUrl()}/boards/${comp.boardId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs md:text-sm text-primary hover:underline transition-colors"
                        >
                          Ver tablero AMS
                        </a>
                      ) : comp.trelloUrl ? (
                        <a
                          href={comp.trelloUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs md:text-sm text-primary hover:underline transition-colors"
                        >
                          Ver en Trello
                        </a>
                      ) : (
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Tablero aún no asignado
                        </p>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent searchParams={searchParams} />
    </Suspense>
  );
}
