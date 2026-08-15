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
  getDelegatesForCompetitions,
  getOrganizersForCompetitions,
} from "./_lib/queries";
import Loading from "./loading";
import { getBoardsUrl, isBoardsEnabled } from "@/lib/boards";

async function PageContent() {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    unauthorized();
  }

  const competitionIds = await getUserOrganizerCompetitionIds(
    session.user.wcaId,
  );

  if (competitionIds.length === 0) {
    return (
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tus competencias</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Aquí puedes ver las competencias que tienes programadas.
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4 md:p-5 shadow-sm">
            <p className="text-muted-foreground">
              No tienes competencias solicitadas.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const [userCompetitions, delegates, organizers] = await Promise.all([
    getUserCompetitions(competitionIds),
    getDelegatesForCompetitions(competitionIds),
    getOrganizersForCompetitions(competitionIds),
  ]);

  // Group delegates by competition
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

  // Group organizers by competition
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

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tus competencias</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Aquí puedes ver las competencias que tienes programadas.
          </p>
        </div>

        <div className="space-y-4">
          {userCompetitions.length === 0 ? (
            <div className="bg-card border rounded-lg p-4 md:p-5 shadow-sm">
              <p className="text-muted-foreground">
                No tienes competencias solicitadas.
              </p>
            </div>
          ) : (
            userCompetitions.map((comp) => {
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
                      {new Date(comp.startDate).toLocaleDateString("es-MX")} -{" "}
                      {new Date(comp.endDate).toLocaleDateString("es-MX")}
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

                  {isBoardsEnabled() && comp.boardId ? (
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
            })
          )}
        </div>
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
