import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ExternalLink, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

import { SiteNav } from "@/components/site-nav";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { getPublicCompetitions } from "@/lib/competitions";
import {
  filterCompetitions,
  formatCompetitionDate,
  formatDate,
  formatMonthKey,
  getFilterOptions,
  isRegistrationOpen,
  statusClassName,
} from "@/lib/competition-format";
import { getCalendarUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Competencias | Asociación Mexicana de Speedcubing",
  description:
    "Consulta próximas competencias oficiales de speedcubing en México con información actualizada desde WCA.",
};

type SearchParams = Promise<{ estado?: string; mes?: string }>;

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ estado, mes }, allCompetitions] = await Promise.all([
    searchParams,
    getPublicCompetitions(),
  ]);
  const { states, months } = getFilterOptions(allCompetitions);
  const state = estado && states.includes(estado) ? estado : undefined;
  const month = mes && months.includes(mes) ? mes : undefined;
  const competitions = filterCompetitions(allCompetitions, { state, month });
  const hasFilters = Boolean(state || month);
  const calendarUrl = getCalendarUrl();

  return (
    <main>
      <SiteNav active="Competencias" />
      <PageHero
        eyebrow="Calendario"
        title="Próximas competencias"
        description="Encuentra competencias oficiales, revisa cupos y entra al registro de cada evento desde la fuente actualizada."
      />
      <section className="bg-white py-20 md:py-24">
        <div className="ams-container">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
                WCA México
              </p>
              <h2 className="ams-display text-[clamp(2rem,5vw,3.5rem)] leading-none">
                Próximas competencias oficiales
              </h2>
            </div>
            <Button asChild variant="outline" className="ams-heading">
              <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
                <CalendarDays className="size-4" />
                Calendario completo
              </a>
            </Button>
          </div>

          {allCompetitions.length > 0 && (
            <form
              method="get"
              className="ams-copy mb-10 flex flex-wrap items-end gap-4 rounded-3xl bg-ams-soft p-5"
              aria-label="Filtrar competencias"
            >
              <label className="flex min-w-48 flex-col gap-1 text-sm font-bold text-ams-navy">
                Estado
                <select
                  name="estado"
                  defaultValue={state ?? ""}
                  className="rounded-md border border-ams-navy/20 bg-white p-2.5 font-normal"
                >
                  <option value="">Todos los estados</option>
                  {states.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-48 flex-col gap-1 text-sm font-bold text-ams-navy">
                Mes
                <select
                  name="mes"
                  defaultValue={month ?? ""}
                  className="rounded-md border border-ams-navy/20 bg-white p-2.5 font-normal"
                >
                  <option value="">Todos los meses</option>
                  {months.map((option) => (
                    <option key={option} value={option}>
                      {formatMonthKey(option)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-md bg-ams-navy px-5 py-2.5 text-sm font-bold text-white"
              >
                Filtrar
              </button>
              {hasFilters && (
                <Link
                  href="/competencias"
                  className="py-2.5 text-sm font-bold underline"
                >
                  Limpiar filtros
                </Link>
              )}
              <p
                className="ml-auto py-2.5 text-sm text-black/60"
                aria-live="polite"
              >
                {competitions.length}{" "}
                {competitions.length === 1 ? "competencia" : "competencias"}
              </p>
            </form>
          )}

          {competitions.length === 0 ? (
            <p className="text-base font-semibold text-black/55">
              {hasFilters
                ? "No hay competencias con esos filtros. Prueba con otro estado o mes."
                : "No hay competencias anunciadas por ahora."}
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {competitions.map((competition, index) => (
                <a
                  key={competition.id}
                  href={competition.wcaCompetitionUrl ?? calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group overflow-hidden bg-white shadow-[0_16px_34px_rgba(1,11,25,0.12)] transition-transform hover:-translate-y-1 ${
                    index % 2 === 1 ? "ams-slash-card-right" : "ams-slash-card"
                  }`}
                >
                  <div className="relative h-52 bg-ams-soft">
                    <Image
                      src={competition.image}
                      alt={competition.name}
                      fill
                      className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <span
                      className={`ams-heading absolute left-0 top-0 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.04em] [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)] ${statusClassName(
                        competition.label,
                      )}`}
                    >
                      {competition.label}
                    </span>
                  </div>
                  <div className="p-6">
                    <p className="ams-heading text-xs font-bold uppercase tracking-[0.04em] text-ams-red">
                      {formatCompetitionDate(
                        competition.startDate,
                        competition.endDate,
                      )}{" "}
                      · {competition.state || "México"}
                    </p>
                    <h3 className="ams-display mt-2 text-2xl leading-none text-ams-navy">
                      {competition.name}
                    </h3>
                    <p className="mt-3 font-bold text-black/55">
                      {competition.city}
                    </p>
                    <div className="mt-5 grid gap-2 text-sm font-semibold text-black/62">
                      <span>
                        Registro: {formatDate(competition.registrationOpen)} -{" "}
                        {formatDate(competition.registrationClose)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Users className="size-4 text-ams-green" />
                        {competition.registered ?? "-"} / {competition.capacity}
                      </span>
                    </div>
                    {isRegistrationOpen(competition.label) ? (
                      <span className="mt-6 inline-flex items-center gap-2 rounded-md bg-ams-green px-4 py-2 font-bold text-white">
                        Inscribirme
                        <ExternalLink className="size-4" />
                      </span>
                    ) : (
                      <span className="mt-6 inline-flex items-center gap-2 font-bold text-ams-green">
                        Ver detalles
                        <ExternalLink className="size-4" />
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
