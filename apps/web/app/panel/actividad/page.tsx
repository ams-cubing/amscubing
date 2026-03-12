import { Suspense } from "react";
import ActivityTable from "./_components/data-table";
import { getActivityLogs } from "./_lib/queries";

async function PageContent() {
  const logsForClient = await getActivityLogs();

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Actividad</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Historial de acciones y cambios en el sistema.
          </p>
        </div>
        <ActivityTable data={logsForClient} />
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}
