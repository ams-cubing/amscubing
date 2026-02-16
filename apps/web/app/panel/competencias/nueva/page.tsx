import { db } from "@/db";
import { CompetitionForm } from "../_components/competition-form";
import { Suspense } from "react";

export default async function Page() {
  const delegates = await db.query.user.findMany({
    where: (user, { eq }) => eq(user.role, "delegate"),
    orderBy: (user, { asc }) => asc(user.name),
  });

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
        <Suspense>
          <CompetitionForm delegates={delegates} />
        </Suspense>
      </div>
    </main>
  );
}
