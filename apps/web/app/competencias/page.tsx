import type { Metadata } from "next";
import Image from "next/image";
import { CalendarDays, ExternalLink, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

import { SiteNav } from "@/components/site-nav";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { getPublicCompetitions } from "@/lib/competitions";
import { CALENDAR_URL } from "@/lib/content";
import { getCalendarUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Competencias | Asociación Mexicana de Speedcubing",
  description:
    "Consulta próximas competencias oficiales de speedcubing en México con información actualizada desde WCA.",
};

const monthNames = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

function statusClassName(label: string) {
  switch (label) {
    case "Inscripciones abiertas":
      return "bg-ams-green text-white";
    case "Lleno":
      return "bg-ams-red text-white";
    case "Casi lleno":
      return "bg-ams-orange text-white";
    case "Cerrado":
      return "bg-ams-navy text-white";
    case "Próximamente":
    default:
      return "border border-black/10 bg-white text-ams-navy";
  }
}

export default async function CompetenciasPage() {
  const competitions = await getPublicCompetitions();
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
          <div className="mb-10 flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
                WCA México
              </p>
              <h2 className="ams-display text-[clamp(2rem,5vw,3.5rem)] leading-none">
                Competencias abiertas y anunciadas
              </h2>
            </div>
            <Button asChild variant="brand" className="shrink-0">
              <a href={calendarUrl}>
                <CalendarDays className="size-4" />
                Ver calendario completo
              </a>
            </Button>
          </div>

          {competitions.length === 0 ? (
            <p className="text-base font-semibold text-black/55">
              No hay competencias anunciadas por ahora.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {competitions.map((competition, index) => (
                <a
                  key={competition.id}
                  href={competition.wcaCompetitionUrl ?? CALENDAR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group overflow-hidden bg-white shadow-[0_16px_34px_rgba(1,11,25,0.12)] transition-transform hover:-translate-y-1 ${
                    index % 2 === 1 ? "ams-slash-card-right" : "ams-slash-card"
                  }`}
                >
                  <div className="relative h-52 bg-ams-soft">
                    <Image
                      src={competition.image}
                      alt=""
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
                    <span className="mt-6 inline-flex items-center gap-2 font-bold text-ams-green">
                      Ver en WCA
                      <ExternalLink className="size-4" />
                    </span>
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

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "-";
  }

  // WCA returns ISO datetimes (`2026-07-27T02:00:00.000Z`); competition
  // dates from the DB are `YYYY-MM-DD`. Take the calendar date either way.
  const cleanDate = dateString.split(/[T\s]/)[0] ?? dateString;
  const [year, month, day] = cleanDate.split("-").map(Number);

  if (!year || !month || !day) {
    return "-";
  }

  return `${String(day).padStart(2, "0")} ${monthNames[month - 1]}`;
}

function formatCompetitionDate(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
