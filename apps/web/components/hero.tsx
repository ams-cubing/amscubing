import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import type { CompetitionSpotlight } from "@/lib/competitions";
import type { CommunityStats } from "@/lib/community-stats";
import { getCalendarUrl } from "@/lib/urls";

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

export function Hero({
  spotlights,
  stats,
}: {
  spotlights: CompetitionSpotlight[];
  stats: CommunityStats;
}) {
  return (
    <section className="relative isolate bg-ams-navy px-0 pb-0 pt-27.5 text-white">
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
          <div className="mb-7 flex max-w-190 flex-wrap gap-3">
            {spotlights.map((competition) => (
              <a
                key={`${competition.status}-${competition.id}`}
                href={competition.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ams-badge inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4.5 py-2 text-xs font-bold uppercase tracking-[0.06em] text-ams-navy transition-transform hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_32px_rgba(0,0,0,0.18)]"
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

        <h1 className="ams-display max-w-180 text-[clamp(44px,6.5vw,96px)] leading-[0.94]">
          <span className="ams-title-line">Resuelve.</span>
          <span
            className="ams-title-line text-ams-orange"
            style={{ animationDelay: "200ms" }}
          >
            Compite.
          </span>
          <span
            className="ams-title-line text-ams-green"
            style={{ animationDelay: "400ms" }}
          >
            Domina.
          </span>
        </h1>

        <p
          className="ams-copy ams-fade-up mt-7 max-w-130 text-xl leading-8 text-white/85"
          style={{ animationDelay: "550ms" }}
        >
          La comunidad oficial WCA de speedcubing en México. Competencias,
          ranking nacional y una comunidad que crece cada mes.
        </p>

        <div
          className="ams-fade-up mt-9 flex flex-wrap gap-4"
          style={{ animationDelay: "700ms" }}
        >
          <Button
            asChild
            size="lg"
            variant="destructive"
            className="ams-glass border border-white/30"
          >
            <Link href="/competencias">
              Ver competencias
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="glass"
            className="border-white/50 hover:bg-white hover:text-ams-navy"
          >
            <a
              href={getCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Calendario completo
            </a>
          </Button>
        </div>
      </div>

      <div className="ams-container relative mt-16 translate-y-1/2">
        <div className="grid overflow-hidden shadow-[0_40px_70px_rgba(0,0,0,0.25)] [clip-path:polygon(0_0,100%_0,100%_82%,97%_100%,0_100%)] md:grid-cols-3">
          <div className="bg-white p-8 text-ams-navy">
            <p className="ams-display text-4xl text-ams-red">WCA</p>
            <p className="mt-2 text-sm font-semibold leading-5">
              Competencias oficiales certificadas en México.
            </p>
          </div>
          <div className="bg-ams-orange p-8">
            <p className="ams-display text-4xl">
              {stats.statesWithCompetitions}
            </p>
            <p className="mt-2 text-sm font-semibold leading-5">
              Estados con competencias.
            </p>
          </div>
          <div className="bg-ams-navy p-8">
            <p className="ams-display text-4xl text-ams-green">
              {stats.officialEvents}
            </p>
            <p className="mt-2 text-sm font-semibold leading-5">
              Eventos oficiales para competir y mejorar.
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
