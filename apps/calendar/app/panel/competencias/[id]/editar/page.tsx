import { Suspense } from "react";
import { notFound } from "next/navigation";

import { CompetitionForm } from "../../_components/competition-form";
import { DeleteCompetitionDialog } from "../../_components/delete-competition";
import { getAllDelegates, getCompetitionWithRelations } from "../_lib/queries";
import Loading from "./loading";

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
