import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";

export function SiteCta() {
  return (
    <section className="relative overflow-hidden bg-ams-red px-0 py-20 text-white">
      <div className="absolute -left-[20%] -top-[20%] h-[140%] w-[140%] rotate-[-6deg] opacity-[0.07] [background-image:url('/source/isotipo-color-sm.png')] [background-position:0_0,45px_25px] [background-repeat:repeat] [background-size:90px_auto]" />
      <div className="absolute bottom-0 left-0 h-[60%] w-[38%] bg-ams-navy opacity-40 [clip-path:polygon(0_100%,45%_100%,20%_0,0_0)]" />
      <div className="ams-container relative text-center">
        <h2 className="ams-display text-[clamp(2rem,5vw,4rem)] leading-none">
          ¿Listo para resolver más rápido?
        </h2>
        <p className="ams-copy mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/85">
          Encuentra tu próxima competencia oficial o súmate como voluntario a la
          comunidad de speedcubing en México.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="ams-glass border border-white/35"
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
            className="border-white/55 hover:bg-white hover:text-ams-red"
          >
            <Link href="/nosotros">Únete a la comunidad</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
