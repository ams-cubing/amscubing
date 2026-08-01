"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { CALENDAR_URL } from "@/lib/content";

export function ProximasCompetencias() {
  return (
    <section className="relative overflow-hidden bg-[var(--ams-ink)] py-20 text-white md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 size-[28rem] -translate-y-1/2 rounded-full bg-[var(--ams-green)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 size-[22rem] rounded-full bg-[var(--ams-red)]/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl"
        >
          <p className="text-sm font-semibold tracking-wide text-[var(--ams-green)] uppercase">
            Próximas competencias
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Consulta fechas, sedes y disponibilidad en todo el país
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/75 md:text-lg">
            El calendario público de la AMS concentra las competencias oficiales
            en México para que organizadores, delegados y competidores planeen
            con claridad.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-white text-[var(--ams-ink)] hover:bg-white/90"
          >
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
              Abrir calendario
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
