import { Suspense } from "react";
import { DateRequestForm } from "./_components/date-request-form";
import { auth } from "@/lib/auth";
import { formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import { headers } from "next/headers";
import { Mail } from "lucide-react";
import {
  getRecentRequestsCount,
  getDelegatesForState,
  getAvailabilityForState,
  getRegionForState,
} from "./_lib/queries";
import Loading from "./loading";

interface PageProps {
  searchParams?: Promise<{
    estado?: string;
  }>;
}

async function PageContent({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return (
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 md:p-5 shadow-sm">
            <p className="text-sm md:text-base text-blue-800 dark:text-blue-200 font-medium">
              Inicia sesión para solicitar una fecha de competencia.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const recentRequestsCount = await getRecentRequestsCount(session.user.wcaId);

  const MAX_REQUESTS_PER_WEEK = 3;
  const canSubmit = recentRequestsCount.length < MAX_REQUESTS_PER_WEEK;

  if (!canSubmit) {
    return (
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Solicitar Fecha de Competencia
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Complete el formulario para solicitar una fecha para su
              competencia. El delegado será asignado automáticamente según la
              ubicación.
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 dark:border-yellow-700 dark:bg-yellow-900/20 rounded-lg p-4 md:p-5 shadow-sm">
            <p className="text-sm md:text-base text-yellow-800 dark:text-yellow-200 font-medium">
              Has alcanzado el límite de solicitudes por semana (
              {MAX_REQUESTS_PER_WEEK}). Por favor, intenta nuevamente en{" "}
              {formatDistance(
                new Date(
                  // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                  recentRequestsCount[0]?.createdAt?.getTime()! +
                    7 * 24 * 60 * 60 * 1000,
                ),
                new Date(),
                {
                  locale: es,
                },
              )}
              .
            </p>
          </div>
        </div>
      </main>
    );
  }

  const resolvedSearchParams = await searchParams;
  const stateFilter = resolvedSearchParams?.estado;

  const delegates = stateFilter ? await getDelegatesForState(stateFilter) : [];

  const availabilityData = stateFilter
    ? await getAvailabilityForState(stateFilter, delegates.length > 0)
    : [];

  const regionName = stateFilter ? await getRegionForState(stateFilter) : null;

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Solicitar Fecha de Competencia
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Complete el formulario para solicitar una fecha para su competencia.
            El delegado será asignado automáticamente según la ubicación.
          </p>
        </div>
        <DateRequestForm availability={availabilityData} />
        {stateFilter && (
          <section className="bg-card border rounded-lg p-5 md:p-6 shadow-sm">
            <h2 className="text-base md:text-lg font-semibold mb-3">
              Región:{" "}
              <span className="font-normal text-muted-foreground">
                {regionName ?? "—"}
              </span>
            </h2>

            {delegates.length > 0 ? (
              <div>
                {availabilityData.length === 0 && stateFilter ? (
                  <div className="text-sm text-destructive mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                    No hay fechas disponibles para la región seleccionada. Por
                    favor, contacta a un delegado directamente.
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    Mostrando fechas disponibles de los delegados de dicha
                    región:
                  </p>
                )}

                <ul className="grid gap-3">
                  {delegates.map((delegate) => (
                    <li
                      key={delegate.email}
                      className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 transition-all hover:shadow-sm hover:border-gray-300 dark:hover:border-slate-600"
                    >
                      <div className="space-y-1.5">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {delegate.name}
                        </div>
                        <a
                          href={`mailto:${delegate.email}`}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Haz clic aquí para contactar</span>
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
                No hay delegados disponibles para esta región, se mostrarán las
                fechas disponibles de todos los delegados.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default function Page(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent searchParams={props.searchParams} />
    </Suspense>
  );
}
