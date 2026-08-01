"use client";

import { motion } from "motion/react";
import { delegates } from "@/lib/content";

export function Delegados() {
  return (
    <section className="border-b border-black/5 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl"
        >
          <p className="text-sm font-semibold tracking-wide text-[var(--ams-red)] uppercase">
            WCA en México
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Delegados WCA en México
          </h2>
          <p className="mt-5 text-base leading-relaxed text-black/70 md:text-lg">
            Personas voluntarias que garantizan la integridad y calidad de las
            competencias oficiales en cada región.
          </p>
        </motion.div>

        <ul className="mt-14 divide-y divide-black/10 border-y border-black/10">
          {delegates.map((delegate, index) => (
            <motion.li
              key={delegate.wcaId}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className="grid gap-2 py-5 md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)] md:items-baseline md:gap-8"
            >
              <div>
                <p className="font-medium tracking-tight">{delegate.name}</p>
                <p className="mt-1 font-mono text-xs text-black/50">
                  {delegate.wcaId}
                </p>
              </div>
              <p className="text-sm text-black/70">{delegate.role}</p>
              <p className="text-sm text-black/55 md:text-right">
                {delegate.region}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
