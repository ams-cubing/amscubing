import { Suspense } from "react";
import { CompetitionForm } from "../_components/competition-form";
import { notFound } from "next/navigation";
import { DeleteCompetitionDialog } from "../_components/delete-competition";
import { formatAction } from "@/lib/utils";
import { DetailsDialog } from "./_components/details-dialog";
import {
  getCompetitionWithRelations,
  getAllDelegates,
  getCompetitionLogs,
} from "./_lib/queries";

type Params = Promise<{ id: string }>;

async function PageContent({
  params,
}: {
  params: Params;
}): Promise<React.JSX.Element> {
  const { id } = await params;

  const [competition, delegates] = await Promise.all([
    getCompetitionWithRelations(Number(id)),
    getAllDelegates(),
  ]);

  if (!competition) {
    notFound();
  }

  const formattedCompetition = {
    ...competition,
    delegates: competition.delegates.map((d) => ({
      delegateWcaId: d.delegateWcaId,
      isPrimary: d.isPrimary,
    })),
    organizers: competition.organizers.map((o) => ({
      organizerWcaId: o.organizerWcaId,
      isPrimary: o.isPrimary,
    })),
  };

  const competitionLogs = await getCompetitionLogs(competition.id);

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Editar Competencia</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Modifica los detalles de la competencia según sea necesario.
          </p>
        </div>
        <CompetitionForm
          delegates={delegates}
          competition={formattedCompetition}
        />
        <DeleteCompetitionDialog competitionId={competition.id} />

        <div className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-4">
            Registro de Actividades
          </h2>
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
        </div>
      </div>
    </main>
  );
}

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <PageContent params={params} />
    </Suspense>
  );
}
