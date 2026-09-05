import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import type { PublicCompetition } from "@/lib/competitions";
import { CALENDAR_URL } from "@/lib/content";

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

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "-";
  }

  const cleanDate = dateString.split(" ")[0] ?? dateString;
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

function statusClassName(label: string) {
  switch (label) {
    case "Inscripciones abiertas":
      return "bg-[var(--ams-green)] text-white";
    case "Lleno":
      return "bg-[var(--ams-red)] text-white";
    case "Casi lleno":
      return "bg-[var(--ams-orange)] text-white";
    case "Cerrado":
      return "bg-[var(--ams-navy)] text-white";
    case "Próximamente":
    default:
      return "border border-black/10 bg-white text-[var(--ams-navy)]";
  }
}

export function ProximasCompetencias({
  competitions,
}: {
  competitions: PublicCompetition[];
}) {
  const trackItems = [...competitions, ...competitions];

  return (
    <section id="torneos" className="overflow-hidden bg-white py-24 md:py-28">
      <div className="ams-container">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-red)]">
              Calendario
            </p>
            <h2 className="ams-display text-[clamp(2rem,5vw,3.75rem)] leading-none">
              Próximos torneos
            </h2>
          </div>
          <Link
            href="/torneos"
            className="ams-heading inline-flex items-center gap-2 text-sm font-bold text-[var(--ams-navy)] transition-colors hover:text-[var(--ams-red)]"
          >
            Ver todos los torneos
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-x-hidden overflow-y-visible py-7">
        <div className="ams-marquee-track flex w-max gap-6 px-4">
          {trackItems.map((competition, index) => (
            <a
              key={`${competition.id}-${index}`}
              href={competition.wcaCompetitionUrl ?? CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ams-slash-card ams-glass group relative block w-[min(84vw,380px)] flex-none overflow-hidden bg-white shadow-[0_16px_34px_rgba(1,11,25,0.13)] hover:scale-[1.04] hover:shadow-[0_24px_40px_rgba(1,11,25,0.24)]"
            >
              <div className="relative h-[200px] bg-[var(--ams-soft)]">
                <Image
                  src={competition.image}
                  alt=""
                  fill
                  className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                  sizes="380px"
                />
                <span
                  className={`ams-heading absolute left-0 top-0 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.04em] [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)] ${statusClassName(
                    competition.label,
                  )}`}
                >
                  {competition.label}
                </span>
              </div>

              <div className="p-[22px]">
                <p className="ams-heading text-xs font-bold uppercase tracking-[0.04em] text-[var(--ams-red)]">
                  {formatCompetitionDate(
                    competition.startDate,
                    competition.endDate,
                  )}{" "}
                  · {competition.state || "México"}
                </p>
                <h3 className="ams-display mt-2 text-[22px] leading-none text-[var(--ams-navy)]">
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
                    <Users className="size-4 text-[var(--ams-green)]" />
                    {competition.registered ?? "-"} / {competition.capacity}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
