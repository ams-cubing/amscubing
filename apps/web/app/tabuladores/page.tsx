import type { Metadata } from "next";
import { Suspense } from "react";

import { AmsCompetitionScaleTables } from "@/components/ams-competition-scale-tables";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getPublicCompetitionScaleTiers } from "@/lib/competition-scale";

export const metadata: Metadata = {
  title: "Tabuladores | Asociación Mexicana de Speedcubing",
  description:
    "Consulta los tabuladores AMS de experiencia del organizador y número de delegados según cupo y estaciones.",
};

async function ScaleTables() {
  const tiers = await getPublicCompetitionScaleTiers();
  return <AmsCompetitionScaleTables tiers={tiers} />;
}

function ScaleTablesFallback() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-8 w-64 animate-pulse rounded bg-ams-soft" />
      <div className="h-48 w-full animate-pulse rounded-5.5 bg-ams-soft" />
      <div className="h-8 w-72 animate-pulse rounded bg-ams-soft" />
      <div className="h-40 w-full animate-pulse rounded-5.5 bg-ams-soft" />
    </div>
  );
}

export default function TabuladoresPage() {
  return (
    <main>
      <SiteNav />
      <PageHero
        eyebrow="Referencia AMS"
        title="Tabuladores de competencia"
        description="Guía para organizadores y sedes: experiencia mínima, cupo, estaciones, categorías y delegados sugeridos según la escala AMS."
      />
      <section className="bg-white py-16 md:py-20">
        <div className="ams-container max-w-280 space-y-6">
          <p className="ams-copy max-w-3xl text-base leading-7 text-black/65">
            Estos tabuladores orientan el tamaño de una competencia AMS. El
            nivel se toma del más estricto entre cupo de competidores y número
            de estaciones. Úsalos al planear sedes, staff y delegados.
          </p>
          <Suspense fallback={<ScaleTablesFallback />}>
            <ScaleTables />
          </Suspense>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
