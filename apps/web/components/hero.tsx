"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Button } from "@workspace/ui/components/button";
import { CALENDAR_URL } from "@/lib/content";

const HERO_IMAGE =
  "https://amscubing.org/wp-content/uploads/2026/06/Foto-Torneo-Rubik-Aragones-2024-4-1024x758-1.jpg";

export function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[var(--ams-ink)] text-white">
      <Image
        src={HERO_IMAGE}
        alt="Competidores en un torneo de speedcubing en México"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/35" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,var(--ams-green)_0%,var(--ams-green)_33%,white_33%,white_66%,var(--ams-red)_66%,var(--ams-red)_100%)]"
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:justify-center md:px-8 md:pb-24 md:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <Image
            src="/logo.png"
            alt="AMS — Asociación Mexicana de Speedcubing"
            width={360}
            height={120}
            priority
            className="mb-8 h-auto w-[min(100%,22rem)]"
          />
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl">
            Speedcubing que une a México
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/85 md:text-lg">
            Promovemos la competencia justa, la inclusión y el compañerismo en
            cada cubo resuelto.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-[var(--ams-green)] text-white hover:bg-[var(--ams-green)]/90"
            >
              <a href="#quienes-somos">Conocer más</a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                Ver calendario
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
