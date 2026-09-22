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
import { unauthorized } from "next/navigation";
import {
  getUserOrganizerCompetitionIds,
  getUserCompetitions,
  getUserDateRequests,
  getDelegatesForCompetitions,
  getOrganizersForCompetitions,
} from "./_lib/queries";
import Loading from "./loading";
import { canAccessBoardsApp } from "@/lib/boards";
import { getBoardsUrl } from "@/lib/urls";
import { toSessionUser, type RawSessionUser } from "@workspace/auth/types";

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

async function PageContent() {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    unauthorized();
  }

  const user = toSessionUser(session.user as RawSessionUser);
  const canSeeBoards = await canAccessBoardsApp(user);
  const wcaId = session.user.wcaId;

  if (!wcaId) {
    return (
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground">Usuario sin WCA ID.</p>
        </div>
      </main>
    );
  }

  const [competitionIds, dateRequestRows] = await Promise.all([
    getUserOrganizerCompetitionIds(wcaId),
    getUserDateRequests(wcaId),
  ]);

  const pendingDateRequests = dateRequestRows.filter(
    (row) => row.status === "open" || row.status === "exhausted",
  );

  const [userCompetitions, delegates, organizers] =
    competitionIds.length > 0
      ? await Promise.all([
          getUserCompetitions(competitionIds),
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
            Aquí puedes ver tus solicitudes de fecha y competencias programadas.
          </p>
        </div>

        {!hasAnything ? (
          <div className="bg-card border rounded-lg p-4 md:p-5 shadow-sm">
            <p className="text-muted-foreground">
              No tienes competencias ni solicitudes de fecha.
            </p>
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

            {userCompetitions.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Competencias</h2>
                {userCompetitions.map((comp) => {
                  const compDelegates = delegatesByCompetition[comp.id] || [];
                  const compOrganizers = organizersByCompetition[comp.id] || [];
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

                      {canSeeBoards && comp.boardId ? (
                        <a
                          href={`${getBoardsUrl()}/boards/${comp.boardId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs md:text-sm text-primary hover:underline transition-colors"
                        >
                          Ver tablero AMS
                        </a>
                      ) : (
                        comp.trelloUrl && (
                          <a
                            href={comp.trelloUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs md:text-sm text-primary hover:underline transition-colors"
                          >
                            Ver en Trello
                          </a>
                        )
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

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent />
    </Suspense>
  );
}
