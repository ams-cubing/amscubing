import { Suspense } from "react";
import { notFound } from "next/navigation";

import { formatAction } from "@/lib/utils";

import { CompetitionDetailView } from "./_components/competition-detail-view";
import { DetailsDialog } from "./_components/details-dialog";
import {
  getCompetitionLogs,
  getCompetitionWithRelations,
} from "./_lib/queries";
import Loading from "./loading";

type Params = Promise<{ id: string }>;

async function PageContent({
  params,
}: {
  params: Params;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const competition = await getCompetitionWithRelations(Number(id));

  if (!competition) {
    notFound();
  }

  const competitionLogs = await getCompetitionLogs(competition.id);

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <CompetitionDetailView competition={competition} />

        <div className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-4">
            Registro de Actividades
          </h2>
          {competitionLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay actividad registrada.
            </p>
          ) : (
            <ul className="space-y-3">
              {competitionLogs.map((log) => (
                <li
                  key={log.id}
                  className="bg-muted/50 border rounded-lg p-3 md:p-4"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">
                      {log.actor
                        ? `${log.actor.name} (${log.actor.wcaId})`
                        : "Usuario eliminado"}
                    </span>{" "}
                    realizó la siguiente acción:{" "}
                    <strong className="text-primary">
                      {formatAction(log.action)}
                    </strong>
                  </p>
                  <DetailsDialog details={log.details} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent params={params} />
    </Suspense>
  );
}
