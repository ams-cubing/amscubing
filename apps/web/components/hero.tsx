import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CALENDAR_URL } from "@/lib/content";
import type { CompetitionSpotlight } from "@/lib/competitions";

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

export function Hero({ spotlights }: { spotlights: CompetitionSpotlight[] }) {
  return (
    <section className="relative isolate bg-[var(--ams-navy)] px-0 pb-0 pt-[110px] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/source/photos/mexchamp-2.jpg"
          alt="Competidores reunidos en un campeonato mexicano de speedcubing"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#010b19_0%,#010b19_55%,rgba(1,11,25,0.15)_100%)]" />
      </div>

      <div className="ams-container relative">
        {spotlights.length > 0 ? (
          <div className="mb-7 flex max-w-[760px] flex-wrap gap-3">
            {spotlights.map((competition) => (
              <a
                key={`${competition.status}-${competition.id}`}
                href={competition.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ams-badge inline-flex max-w-full items-center gap-2 rounded-full bg-white px-[18px] py-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--ams-navy)] transition-transform hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_32px_rgba(0,0,0,0.18)]"
                aria-label={`${competition.status}: ${competition.name}`}
              >
                <span className="ams-badge-dot size-2 rounded-full" />
                <span className="ams-badge-word">
                  {competition.status}
                </span> ·{" "}
                <span className="truncate">
                  {competition.name} · {formatDate(competition.startDate)} ·{" "}
                  {competition.state || competition.city}
                </span>
              </a>
            ))}
          </div>
        ) : null}

        <h1 className="ams-display max-w-[720px] text-[clamp(44px,6.5vw,96px)] leading-[0.94]">
          <span className="ams-title-line">Resuelve.</span>
          <span
            className="ams-title-line text-[var(--ams-orange)]"
            style={{ animationDelay: "200ms" }}
          >
            Compite.
          </span>
          <span
            className="ams-title-line text-[var(--ams-green)]"
            style={{ animationDelay: "400ms" }}
          >
            Domina.
          </span>
        </h1>

        <p
          className="ams-copy ams-fade-up mt-7 max-w-[520px] text-xl leading-8 text-white/85"
          style={{ animationDelay: "550ms" }}
        >
          La comunidad oficial WCA de speedcubing en México. Torneos, ranking
          nacional y una comunidad que crece cada mes.
        </p>

        <div
          className="ams-fade-up mt-9 flex flex-wrap gap-4"
          style={{ animationDelay: "700ms" }}
        >
          <a
            href="/torneos"
            className="ams-glass inline-flex items-center gap-2 rounded-full border border-white/30 bg-[linear-gradient(135deg,rgba(186,12,47,0.94),rgba(186,12,47,0.62))] px-6 py-4 font-bold text-white shadow-[0_8px_24px_rgba(186,12,47,0.35)]"
          >
            Ver torneos
            <ArrowRight className="size-4" />
          </a>
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ams-glass inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/10 px-6 py-4 font-bold text-white hover:bg-white hover:text-[var(--ams-navy)]"
          >
            Calendario completo
          </a>
        </div>
      </div>

      <div className="ams-container relative mt-16 translate-y-1/2">
        <div className="grid overflow-hidden shadow-[0_40px_70px_rgba(0,0,0,0.25)] [clip-path:polygon(0_0,100%_0,100%_82%,97%_100%,0_100%)] md:grid-cols-3">
          <div className="bg-white p-8 text-[var(--ams-navy)]">
            <p className="ams-display text-4xl text-[var(--ams-red)]">WCA</p>
            <p className="mt-2 text-sm font-semibold leading-5">
              Torneos oficiales certificados en México.
            </p>
          </div>
          <div className="bg-[var(--ams-orange)] p-8">
            <p className="ams-display text-4xl">18</p>
            <p className="mt-2 text-sm font-semibold leading-5">
              Estados con sede de competencia en la maqueta nueva.
            </p>
          </div>
          <div className="bg-[var(--ams-navy)] p-8">
            <p className="ams-display text-4xl text-[var(--ams-green)]">17+</p>
            <p className="mt-2 text-sm font-semibold leading-5">
              Categorías oficiales para competir y mejorar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return dateString;
  }

  return `${String(day).padStart(2, "0")} ${monthNames[month - 1]}`;
}
