import { db } from "@/db";
import { DataTable } from "./_components/data-table";

export default async function Page() {
  const allComps = await db.query.competitions.findMany({
    orderBy: (t, { asc }) => [asc(t.startDate)],
    with: {
      state: {
        with: {
          region: true,
        },
      },
      delegates: {
        with: {
          delegate: true,
        },
      },
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Vista Privada de Delegado
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Gestiona todas las competencias y solicitudes del calendario.
          </p>
        </div>

        <DataTable data={allComps} />
      </div>
    </div>
  );
}
