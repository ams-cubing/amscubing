import { Suspense } from "react";
import { DateRequestForm } from "./_components/date-request-form";
import { auth } from "@/lib/auth";
import { formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import { headers } from "next/headers";
import { Mail } from "lucide-react";
import { AmsSignInPrompt } from "@workspace/ui/components/ams-sign-in-prompt";
import { getCalendarUrl, getCrossAppSignInUrl } from "@/lib/urls";
import { MAX_DATE_REQUESTS_PER_WEEK } from "./_lib/constants";
import {
  getRecentRequestsCount,
  getDelegatesForState,
  getAvailabilityForState,
  getRegionForState,
} from "./_lib/queries";
import Loading from "./loading";
import {
  BrandCallout,
  PublicPageShell,
} from "../_components/public-page-shell";

const PAGE_DESCRIPTION =
  "Completa el formulario para solicitar una fecha para tu competencia. Se propondrá un delegado según la ubicación; la asignación queda pendiente de su confirmación.";

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

  const resolvedSearchParams = await searchParams;
  const stateFilter = resolvedSearchParams?.estado;

  if (!session) {
    const returnTo = new URL(`${getCalendarUrl()}/solicitar-fecha`);
    if (stateFilter) returnTo.searchParams.set("estado", stateFilter);
    return (
      <PublicPageShell
        title="Solicitar fecha"
        description={PAGE_DESCRIPTION}
        width="narrow"
      >
        <AmsSignInPrompt
          title="Inicia sesión para solicitar una fecha"
          description="Puedes entrar con tu cuenta AMS o WCA; no necesitas WCA ID para organizar. Al iniciar sesión volverás a este formulario."
          signInHref={getCrossAppSignInUrl(returnTo.toString())}
        />
      </PublicPageShell>
    );
  }

  const recentRequestsCount = await getRecentRequestsCount(session.user.id);
  const canSubmit = recentRequestsCount.length < MAX_DATE_REQUESTS_PER_WEEK;

  if (!canSubmit) {
    return (
      <PublicPageShell
        title="Solicitar fecha"
        description={PAGE_DESCRIPTION}
        width="narrow"
      >
        <BrandCallout tone="warning">
          Has alcanzado el límite de solicitudes por semana (
          {MAX_DATE_REQUESTS_PER_WEEK}). Por favor, intenta nuevamente en{" "}
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
        </BrandCallout>
      </PublicPageShell>
    );
  }

  const delegates = stateFilter ? await getDelegatesForState(stateFilter) : [];

  const availabilityData = stateFilter
    ? await getAvailabilityForState(stateFilter, delegates.length > 0)
    : [];

  const regionName = stateFilter ? await getRegionForState(stateFilter) : null;

  return (
    <PublicPageShell
      title="Solicitar fecha"
      description={PAGE_DESCRIPTION}
      width="narrow"
    >
      <DateRequestForm availability={availabilityData} />
      {stateFilter && (
        <section className="rounded-3xl bg-ams-soft p-5 md:p-6">
          <h2 className="ams-display mb-3 text-2xl leading-none">
            Región:{" "}
            <span className="ams-copy text-lg font-normal normal-case text-black/60">
              {regionName ?? "—"}
            </span>
          </h2>

          {delegates.length > 0 ? (
            <div>
              {availabilityData.length === 0 && stateFilter ? (
                <div className="mb-4">
                  <BrandCallout tone="danger">
                    No hay fechas disponibles para la región seleccionada. Por
                    favor, contacta a un delegado directamente.
                  </BrandCallout>
                </div>
              ) : (
                <p className="ams-copy mb-4 text-sm text-black/60">
                  Mostrando fechas disponibles de los delegados de dicha región:
                </p>
              )}

              <ul className="grid gap-3">
                {delegates.map((delegate) => (
                  <li
                    key={delegate.email}
                    className="rounded-2xl bg-white px-4 py-3 transition-shadow hover:shadow-[0_10px_24px_rgba(1,11,25,0.08)]"
                  >
                    <div className="space-y-1.5">
                      <div className="ams-heading font-bold text-ams-navy">
                        {delegate.name}
                      </div>
                      <a
                        href={`mailto:${delegate.email}`}
                        className="ams-copy inline-flex items-center gap-1.5 text-xs text-black/60 transition-colors hover:text-ams-green"
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
            <BrandCallout>
              No hay delegados disponibles para esta región, se mostrarán las
              fechas disponibles de todos los delegados.
            </BrandCallout>
          )}
        </section>
      )}
    </PublicPageShell>
  );
}

export default function Page(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent searchParams={props.searchParams} />
    </Suspense>
  );
}
