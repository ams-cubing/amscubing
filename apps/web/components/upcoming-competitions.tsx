import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { PublicCompetition } from "@/lib/competitions";
import {
  formatCompetitionDate,
  formatDate,
  isRegistrationOpen,
  statusVariant,
} from "@/lib/competition-format";
import { getCalendarUrl } from "@/lib/urls";

export function UpcomingCompetitions({
  competitions,
}: {
  competitions: PublicCompetition[];
}) {
  const trackItems = [...competitions, ...competitions];

  return (
    <section
      id="competencias"
      className="overflow-hidden bg-white py-24 md:py-28"
    >
      <div className="ams-container">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
              Calendario
            </p>
            <h2 className="ams-display text-[clamp(2rem,5vw,3.75rem)] leading-none">
              Próximas competencias
            </h2>
          </div>
          <Button asChild variant="link" className="ams-heading px-0">
            <Link href="/competencias">
              Ver todas las competencias
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {competitions.length === 0 ? (
        <div className="ams-container">
          <p className="text-base font-semibold text-black/55">
            No hay competencias anunciadas por ahora.
          </p>
        </div>
      ) : (
        <div className="overflow-x-hidden overflow-y-visible py-7">
          <div className="ams-marquee-track flex w-max gap-6 px-4">
            {trackItems.map((competition, index) => {
              const isDuplicate = index >= competitions.length;
              return (
                <a
                  key={`${competition.id}-${index}`}
                  href={competition.wcaCompetitionUrl ?? getCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-hidden={isDuplicate || undefined}
                  tabIndex={isDuplicate ? -1 : undefined}
                  className="ams-slash-card ams-glass group relative block w-[min(84vw,380px)] flex-none overflow-hidden bg-white shadow-[0_16px_34px_rgba(1,11,25,0.13)] hover:scale-[1.04] hover:shadow-[0_24px_40px_rgba(1,11,25,0.24)]"
                >
                  <div className="relative h-50 bg-ams-soft">
                    <Image
                      src={competition.image}
                      alt={competition.name}
                      fill
                      className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                      sizes="380px"
                    />
                    <Badge
                      variant={statusVariant(competition.label)}
                      className="ams-heading absolute left-0 top-0 rounded-none px-3 py-2 text-[11px] uppercase tracking-[0.04em] [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]"
                    >
                      {competition.label}
                    </Badge>
                  </div>

                  <div className="p-5.5">
                    <p className="ams-heading text-xs font-bold uppercase tracking-[0.04em] text-ams-red">
                      {formatCompetitionDate(
                        competition.startDate,
                        competition.endDate,
                      )}{" "}
                      · {competition.state || "México"}
                    </p>
                    <h3 className="ams-display mt-2 text-[22px] leading-none text-ams-navy">
                      {competition.name}
                    </h3>
                    <p className="ams-heading mt-3 text-sm font-bold text-black/55">
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
                    {isRegistrationOpen(competition.label) && (
                      <span className="mt-5 inline-flex items-center gap-2 rounded-md bg-ams-green px-4 py-2 text-sm font-bold text-white">
                        Inscribirme
                        <ArrowRight className="size-4" />
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
