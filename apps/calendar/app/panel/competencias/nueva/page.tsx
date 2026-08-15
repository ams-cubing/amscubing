import { CompetitionForm } from "../_components/competition-form";
import { Suspense } from "react";
import { getDelegates } from "./_lib/queries";
import Loading from "./loading";

async function PageContent() {
  const delegates = await getDelegates();

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Crear nueva Competencia
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Usa el formulario a continuación para crear una nueva competencia.
          </p>
        </div>
        <CompetitionForm delegates={delegates} />
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
