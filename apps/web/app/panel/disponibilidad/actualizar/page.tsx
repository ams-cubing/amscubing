import { Suspense } from "react";
import { AvailabilityForm } from "../_components/availability-form";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserAvailability, getDelegateBusyDays } from "./_lib/queries";

async function PageContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const wcaId = session?.user.wcaId ?? "";

  const [availabilityDates, delegateBusyDays] = await Promise.all([
    getUserAvailability(wcaId),
    getDelegateBusyDays(wcaId),
  ]);

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

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}
