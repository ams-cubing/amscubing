import Image from "next/image";
import type { PublicDelegate } from "@/lib/delegate-types";
import { aboutIntro, mission, vision } from "@/lib/content";

const objectives = [
  {
    number: "01",
    color: "text-[var(--ams-red)]",
    title: "Más y mejores competencias",
    description:
      "Organizar competencias más grandes y accesibles, y llevarlas a estados que nunca han tenido eventos oficiales de la WCA.",
  },
  {
    number: "02",
    color: "text-[var(--ams-orange)]",
    title: "Profesionalizar el deporte",
    description:
      "Estandarizar procesos y buscar reconocimiento como federación deportiva por CONADE y Organización Regional con la WCA.",
  },
  {
    number: "03",
    color: "text-[var(--ams-green)]",
    title: "Inclusión y voluntariado",
    description:
      "Fomentar la participación de todas las edades y regiones, y facilitar clubes estatales y municipales de speedcubing.",
  },
];

const plans = [
  {
    letter: "G",
    color: "bg-[var(--ams-red)]",
    title: "Gobernabilidad",
    description:
      "Constituir equipos de trabajo diversificados que atraigan voluntarios para las actividades de la organización.",
  },
  {
    letter: "C",
    color: "bg-[var(--ams-orange)]",
    title: "Calidad",
    description:
      "Estandarizar y unificar procesos y calidad de competencias en México con políticas y procedimientos claros.",
  },
  {
    letter: "E",
    color: "bg-[var(--ams-green)]",
    title: "Equipo",
    description:
      "Donar el equipo adquirido en México a la Organización Regional para su correcta distribución y mantenimiento.",
  },
];

const communityPhotos = [
  "/source/photos/mexchamp-1.jpg",
  "/source/photos/chalco-2.jpg",
  "/source/photos/ponny-2.jpg",
  "/source/photos/guelaguetza-1.jpg",
];

export function QuienesSomos({ delegates }: { delegates: PublicDelegate[] }) {
  return (
    <section id="quienes-somos" className="bg-white">
      <div className="relative overflow-hidden bg-[var(--ams-navy)] px-0 py-20 text-white md:py-24">
        <div className="ams-texture absolute inset-0 opacity-25" />
        <div className="absolute -right-28 -top-36 h-[26rem] w-[26rem] rotate-[10deg] bg-[var(--ams-red)] opacity-85 [clip-path:polygon(50%_0%,100%_40%,80%_100%,20%_90%)]" />
        <div className="ams-container relative">
          <p className="ams-heading mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-orange)]">
            Gente, no solo cubos
          </p>
          <h2 className="ams-display text-[clamp(2.6rem,7vw,5rem)] leading-none">
            NOS<span className="text-[var(--ams-red)]">O</span>TR
            <span className="text-[var(--ams-green)]">O</span>S
          </h2>
          <p className="ams-copy mt-5 max-w-2xl text-lg leading-8 text-white/78">
            Somos una comunidad apasionada por el speedcubing en México,
            dedicada a promover la diversión, la competencia y el compañerismo.
          </p>
        </div>
      </div>

      <div className="ams-container py-20 text-center md:py-24">
        <h3 className="ams-display text-[clamp(2rem,5vw,3rem)] leading-none">
          ¿Quiénes s<span className="text-[var(--ams-red)]">o</span>mos?
        </h3>
        <p className="mx-auto mt-7 max-w-5xl text-lg leading-8 text-black/70">
          {aboutIntro} Organizamos{" "}
          <span className="font-bold text-[var(--ams-green)]">
            torneos oficiales
          </span>
          , facilitamos la llegada de nuevos competidores y respaldamos a
          organizadores y voluntarios en todo el país.
        </p>
      </div>

      <div className="ams-container grid gap-6 pb-20 md:grid-cols-2 md:pb-24">
        <article className="relative overflow-hidden rounded-[20px] bg-[var(--ams-soft)] p-8 md:p-11">
          <div className="ams-texture absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <h3 className="ams-display mb-4 text-3xl text-[var(--ams-red)]">
              Misión
            </h3>
            <p className="text-base leading-8 text-black/70">{mission}</p>
          </div>
        </article>
        <article className="ams-texture relative overflow-hidden rounded-[20px] bg-[var(--ams-navy)] p-8 text-white md:p-11">
          <div className="absolute inset-0 bg-[var(--ams-navy)]/90" />
          <div className="relative">
            <h3 className="ams-display mb-4 text-3xl text-[var(--ams-orange)]">
              Visión
            </h3>
            <p className="text-base leading-8 text-white/78">{vision}</p>
          </div>
        </article>
      </div>

      <div className="ams-container pb-20 md:pb-24">
        <h3 className="ams-display mb-6 text-[clamp(1.9rem,4vw,2.75rem)] leading-none">
          N<span className="text-[var(--ams-red)]">u</span>estros objetivos
        </h3>
        <p className="mb-11 max-w-4xl text-base leading-7 text-black/70">
          Trabajamos para hacer del speedcubing un deporte reconocido y valorado
          en México, con enfoque en inclusión, profesionalización y valores
          deportivos.
        </p>
        <div className="grid gap-6 lg:grid-cols-3">
          {objectives.map((objective, index) => (
            <article
              key={objective.title}
              className={`bg-[var(--ams-soft)] p-7 ${
                index === 1
                  ? "[clip-path:polygon(0_0,100%_0,100%_90%,90%_100%,0_100%)]"
                  : "[clip-path:polygon(0_0,100%_0,100%_100%,10%_100%,0_90%)]"
              }`}
            >
              <p
                className={`ams-display mb-4 text-3xl leading-none ${objective.color}`}
              >
                {objective.number}
              </p>
              <h4 className="ams-heading mb-3 text-base font-bold">
                {objective.title}
              </h4>
              <p className="ams-copy text-sm leading-6 text-black/70">
                {objective.description}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="ams-texture bg-[var(--ams-navy)] py-20 text-white md:py-24">
        <div className="ams-container">
          <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-orange)]">
            Planes
          </p>
          <h3 className="ams-display mb-11 text-[clamp(1.9rem,4vw,2.75rem)] leading-none">
            Có<span className="text-[var(--ams-green)]">m</span>o lo vamos a
            lograr
          </h3>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.title} className="rounded-2xl bg-white/5 p-7">
                <div
                  className={`mb-5 flex size-12 items-center justify-center rounded-full ${plan.color}`}
                >
                  <span className="ams-display text-lg text-white">
                    {plan.letter}
                  </span>
                </div>
                <h4 className="ams-heading mb-3 text-base font-bold text-white">
                  {plan.title}
                </h4>
                <p className="ams-copy text-sm leading-6 text-white/65">
                  {plan.description}
                </p>
              </article>
            ))}
          </div>

          <div id="delegados" className="mt-20">
            <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-orange)]">
              Equipo
            </p>
            <h3 className="ams-display mb-11 text-[clamp(1.9rem,4vw,2.75rem)] leading-none">
              Delegados <span className="text-[var(--ams-red)]">WCA</span> en
              México
            </h3>
            <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {delegates.map((delegate) => (
                <a
                  key={delegate.wcaId}
                  href={delegate.wcaProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group text-center"
                >
                  <div className="relative mx-auto mb-4 flex size-[140px] items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/8 transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-105">
                    {delegate.avatarUrl ? (
                      <Image
                        src={delegate.avatarUrl}
                        alt={`Foto de ${delegate.name}`}
                        fill
                        className="object-cover"
                        sizes="140px"
                      />
                    ) : (
                      <span className="ams-display text-3xl text-white">
                        {getInitials(delegate.name)}
                      </span>
                    )}
                  </div>
                  <h4 className="ams-heading mx-auto max-w-[15rem] text-sm font-bold leading-6 text-white">
                    {delegate.name}
                  </h4>
                  <p className="ams-heading mt-2 text-xs text-[var(--ams-orange)]">
                    {delegate.title}
                  </p>
                  <p className="ams-heading mt-1 text-xs text-white/50">
                    {delegate.location}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ams-container py-20 md:py-24">
        <h3 className="ams-display mb-10 text-[clamp(1.9rem,4vw,2.75rem)] leading-none">
          M<span className="text-[var(--ams-orange)]">o</span>mentos de la com
          <span className="text-[var(--ams-green)]">u</span>nidad
        </h3>
        <div className="-my-4 overflow-x-hidden overflow-y-visible py-4">
          <div className="flex w-max animate-[ams-marquee_30s_linear_infinite] gap-4 hover:[animation-play-state:paused]">
            {[...communityPhotos, ...communityPhotos].map((photo, index) => (
              <Image
                key={`${photo}-${index}`}
                src={photo}
                alt="Momento de la comunidad AMS"
                width={320}
                height={220}
                className="h-[220px] w-[320px] flex-none rounded-[14px] object-cover shadow-[0_12px_28px_rgba(1,11,25,0.14)] transition-transform duration-300 hover:-translate-y-1.5 hover:scale-[1.03]"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
