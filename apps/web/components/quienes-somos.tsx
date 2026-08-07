"use client";

import { motion } from "motion/react";
import { aboutIntro, mission, vision } from "@/lib/content";

export function QuienesSomos() {
  return (
    <section
      id="quienes-somos"
      className="scroll-mt-8 border-b border-black/5 bg-white py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="text-sm font-semibold tracking-wide text-[var(--ams-green)] uppercase">
            Quiénes somos
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Comunidad, competencia y compañerismo
          </h2>
          <p className="mt-5 text-base leading-relaxed text-black/70 md:text-lg">
            {aboutIntro}
          </p>
        </motion.div>

        <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <h3 className="text-xl font-semibold tracking-tight">Misión</h3>
            <p className="mt-4 text-sm leading-relaxed text-black/70 md:text-base">
              {mission}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <h3 className="text-xl font-semibold tracking-tight">Visión</h3>
            <p className="mt-4 text-sm leading-relaxed text-black/70 md:text-base">
              {vision}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
