import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { SiteNav } from "@/components/site-nav";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { COURSES_URL } from "@/lib/content";

export const metadata: Metadata = {
  title: "Cursos | Asociación Mexicana de Speedcubing",
  description:
    "Capacitación para staff, voluntarios y organizadores de speedcubing en México.",
};

const courseTracks = [
  {
    icon: GraduationCap,
    title: "Staff de competencia",
    description:
      "Aprende el flujo básico de una competencia oficial, roles de staff y buenas prácticas para apoyar mesas y grupos.",
  },
  {
    icon: ShieldCheck,
    title: "Reglamento WCA",
    description:
      "Repasa criterios esenciales de jueceo, penalizaciones y preparación para aplicar el reglamento con claridad.",
  },
  {
    icon: Users,
    title: "Organización local",
    description:
      "Conecta con la comunidad, prepara voluntarios y entiende los pasos para llevar eventos oficiales a más sedes.",
  },
];

export default function CursosPage() {
  return (
    <main>
      <SiteNav active="Cursos" />
      <PageHero
        eyebrow="Capacitación"
        title="Cursos AMS"
        description="Formación para que más personas puedan participar, apoyar y organizar competencias oficiales en México."
      />
      <section className="bg-white py-20 md:py-24">
        <div className="ams-container grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
              Aprende y participa
            </p>
            <h2 className="ams-display mb-6 text-[clamp(2rem,5vw,3.5rem)] leading-none">
              Capacitación para la comunidad
            </h2>
            <p className="text-base leading-8 text-black/70">
              Los cursos siguen operando en la plataforma dedicada de AMS. Esta
              página sirve como entrada desde el sitio principal y mantiene el
              estilo de la nueva web.
            </p>
            <Button
              asChild
              size="lg"
              className="ams-glass mt-8 border border-white/35"
            >
              <a href={COURSES_URL} target="_blank" rel="noopener noreferrer">
                Ir a cursos
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
          <div className="grid gap-5">
            {courseTracks.map((track, index) => {
              const Icon = track.icon;

              return (
                <article
                  key={track.title}
                  className={`bg-ams-soft p-7 ${
                    index === 1 ? "ams-slash-card-right" : "ams-slash-card"
                  }`}
                >
                  <Icon className="mb-5 size-8 text-ams-red" />
                  <h3 className="ams-heading mb-3 text-lg font-bold">
                    {track.title}
                  </h3>
                  <p className="ams-copy text-base leading-7 text-black/68">
                    {track.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="relative h-[24rem] overflow-hidden bg-ams-navy">
        <Image
          src="/source/photos/ponny-1.jpg"
          alt="Competidores y staff en competencia AMS"
          fill
          className="object-cover opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#010b19_0%,rgba(1,11,25,0.62)_55%,rgba(1,11,25,0.08)_100%)]" />
      </section>
      <SiteFooter />
    </main>
  );
}
