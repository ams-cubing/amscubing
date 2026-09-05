import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function SiteCta() {
  return (
    <section className="relative overflow-hidden bg-[var(--ams-red)] px-0 py-20 text-white">
      <div className="absolute -left-[20%] -top-[20%] h-[140%] w-[140%] rotate-[-6deg] opacity-[0.07] [background-image:url('/source/isotipo-color-sm.png')] [background-position:0_0,45px_25px] [background-repeat:repeat] [background-size:90px_auto]" />
      <div className="absolute bottom-0 left-0 h-[60%] w-[38%] bg-[var(--ams-navy)] opacity-40 [clip-path:polygon(0_100%,45%_100%,20%_0,0_0)]" />
      <div className="ams-container relative text-center">
        <h2 className="ams-display text-[clamp(2rem,5vw,4rem)] leading-none">
          ¿Listo para resolver más rápido?
        </h2>
        <p className="ams-copy mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/85">
          Encuentra tu próximo torneo oficial o súmate como voluntario a la
          comunidad de speedcubing en México.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link
            href="/torneos"
            className="ams-glass inline-flex items-center gap-2 rounded-full border border-white/35 bg-[linear-gradient(135deg,rgba(0,154,68,0.92),rgba(0,154,68,0.62))] px-7 py-4 font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.25)]"
          >
            Ver torneos
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/nosotros"
            className="ams-glass rounded-full border border-white/55 bg-white/12 px-7 py-4 font-bold text-white hover:bg-white hover:text-[var(--ams-red)]"
          >
            Únete a la comunidad
          </Link>
        </div>
      </div>
    </section>
  );
}
