import { db } from "@/db";
import { AvailabilityForm } from "../_components/availability-form";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const availabilityDates = await db.query.availability.findMany({
    where: (availability, { eq }) =>
      eq(availability.userWcaId, session?.user.wcaId ?? ""),
    columns: {
      date: true,
    },
  });

  // Query competitions where the current user is a delegate
  const delegateCompetitionRows = await db.query.competitionDelegates.findMany({
    where: (cd, { eq }) => eq(cd.delegateWcaId, session?.user.wcaId ?? ""),
    columns: { competitionId: true },
  });

  const competitionIds = delegateCompetitionRows.map((r) => r.competitionId);

  const delegateBusyCompetitions =
    competitionIds.length > 0
      ? await db.query.competitions.findMany({
          where: (c, { inArray }) => inArray(c.id, competitionIds),
          columns: {
            startDate: true,
            endDate: true,
          },
        })
      : [];

  const delegateBusyDaysSet = new Set<string>();
  for (const comp of delegateBusyCompetitions) {
    if (!comp?.startDate || !comp?.endDate) continue;
    const start = new Date(comp.startDate);
    const end = new Date(comp.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      delegateBusyDaysSet.add(d.toISOString().slice(0, 10));
    }
  }

  const delegateBusyDays = Array.from(delegateBusyDaysSet).sort();

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Actualizar Disponibilidad
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Seleccione las fechas en las que está disponible para delegar.
          </p>
        </div>
        <AvailabilityForm
          availabilityDates={availabilityDates}
          busyDays={delegateBusyDays}
        />
      </div>
    </main>
  );
}
