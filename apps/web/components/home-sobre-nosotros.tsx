import Image from "next/image";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { aboutIntro } from "@/lib/content";

export function HomeSobreNosotros() {
  return (
    <section className="bg-white py-24 md:py-28">
      <div className="ams-container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
            Sobre nosotros
          </p>
          <h2 className="ams-display mb-6 text-[clamp(2rem,5vw,3.75rem)] leading-none">
            Somos la comunidad oficial <span className="text-ams-red">WCA</span>{" "}
            en <span className="text-ams-green">México</span>
          </h2>
          <p className="text-base leading-8 text-black/70">{aboutIntro}</p>
          <p className="mt-3 text-base leading-8 text-black/70">
            Organizamos competencias oficiales, facilitamos la llegada de nuevos
            competidores y respaldamos a organizadores y voluntarios en todo el
            país.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              variant="accent"
              className="ams-glass border border-white/35"
            >
              <Link href="/nosotros">Conoce a la comunidad</Link>
            </Button>
          </div>
        </div>

        <div className="grid min-h-[25rem] grid-cols-2">
          <div className="relative [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">
            <Image
              src="/source/photos/mexchamp-3.jpg"
              alt="Competencia mexicana de speedcubing"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 350px"
            />
          </div>
          <div className="relative -ml-8 overflow-hidden bg-ams-red [clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]">
            <Image
              src="/source/photos/guelaguetza-1.jpg"
              alt="Mesa de competencia durante una competencia AMS"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 350px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
