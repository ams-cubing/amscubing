"use client";

import { useMemo, useState } from "react";
import type { EventRanking, RankingType } from "@/lib/rankings";

export function RankingNacional({ rankings }: { rankings: EventRanking[] }) {
  const [eventId, setEventId] = useState(rankings[0]?.event.id ?? "333");
  const [type, setType] = useState<RankingType>("single");

  const activeRanking = useMemo(
    () =>
      rankings.find((ranking) => ranking.event.id === eventId) ?? rankings[0],
    [eventId, rankings],
  );

  const activeType =
    type === "average" && !activeRanking?.event.supportsAverage
      ? "single"
      : type;

  const rows = activeRanking?.[activeType] ?? [];
  const rankingUrl = activeRanking
    ? `https://www.cubingmexico.net/rankings/${activeRanking.event.id}/${activeType}`
    : "https://www.cubingmexico.net/rankings/333/single";

  return (
    <section
      id="ranking"
      className="ams-texture relative overflow-hidden bg-[var(--ams-navy)] py-24 text-white md:py-28"
    >
      <div className="absolute inset-0 bg-[var(--ams-navy)]/95" />
      <div className="ams-container relative">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-orange)]">
              Rankings WCA México
            </p>
            <h2 className="ams-display text-[clamp(2rem,5vw,3.75rem)] leading-none">
              Ranking nacional
            </h2>
            <p className="ams-copy mt-4 max-w-3xl text-base leading-7 text-white/62">
              Consulta el top mexicano por evento y tipo de resultado. Los datos
              se leen desde Cubing México, que consolida resultados oficiales
              WCA.
            </p>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/5 px-5 py-4 text-right">
            <p className="ams-display text-3xl text-[var(--ams-orange)]">
              {rankings.length}
            </p>
            <p className="ams-heading mt-1 text-xs font-bold uppercase tracking-[0.08em] text-white/55">
              Categorías activas
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rankings.map((ranking) => (
            <button
              key={ranking.event.id}
              type="button"
              title={ranking.event.name}
              aria-label={ranking.event.name}
              onClick={() => {
                setEventId(ranking.event.id);
                if (!ranking.event.supportsAverage) {
                  setType("single");
                }
              }}
              className={`flex size-12 flex-none items-center justify-center rounded-xl border transition-colors ${
                ranking.event.id === activeRanking?.event.id
                  ? "border-white bg-white text-[var(--ams-navy)] shadow-[0_10px_24px_rgba(255,255,255,0.16)]"
                  : "border-white/12 bg-white/5 text-white/35 hover:border-white/35 hover:text-white"
              }`}
            >
              <span
                aria-hidden="true"
                className={`cubing-icon event-${ranking.event.id} ams-event-icon`}
              />
              <span className="sr-only">{ranking.event.name}</span>
            </button>
          ))}
        </div>

        <div className="mb-6 flex gap-2">
          {(["single", "average"] as const).map((rankingType) => (
            <button
              key={rankingType}
              type="button"
              disabled={
                rankingType === "average" &&
                !activeRanking?.event.supportsAverage
              }
              onClick={() => setType(rankingType)}
              className={`ams-heading rounded-full px-5 py-2 text-sm font-bold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                activeType === rankingType
                  ? "bg-white text-[var(--ams-navy)]"
                  : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              {rankingType === "single" ? "Single" : "Average"}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-white/15">
          <div className="grid grid-cols-[70px_1fr_120px] gap-3 bg-white/5 px-4 py-4 text-xs font-bold uppercase tracking-[0.06em] text-white/52 md:grid-cols-[80px_1fr_150px_180px] md:px-7">
            <div>#</div>
            <div>Competidor</div>
            <div>Resultado</div>
            <div className="hidden md:block">Estado</div>
          </div>

          {rows.length > 0 ? (
            rows.map((row, index) => (
              <a
                key={`${activeRanking?.event.id}-${activeType}-${row.personId}`}
                href={row.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`grid grid-cols-[70px_1fr_120px] gap-3 border-t border-white/10 px-4 py-4 transition-colors hover:bg-white/8 md:grid-cols-[80px_1fr_150px_180px] md:px-7 ${
                  index === 0 ? "bg-[rgba(254,80,0,0.08)]" : ""
                }`}
              >
                <div className="ams-display text-xl text-[var(--ams-orange)]">
                  {row.countryRank}
                </div>
                <div>
                  <p className="ams-heading text-sm font-bold leading-tight text-white md:text-base">
                    {row.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/45 md:hidden">
                    {row.state}
                  </p>
                </div>
                <div className="ams-display text-lg text-white">
                  {row.result}
                </div>
                <div className="hidden text-sm font-semibold text-white/62 md:block">
                  {row.state}
                </div>
              </a>
            ))
          ) : (
            <div className="border-t border-white/10 px-7 py-10 text-center text-sm font-semibold text-white/55">
              No hay resultados disponibles para esta categoría.
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-white/45">
          <span>
            Mostrando top {rows.length} de {activeRanking?.event.name} ·{" "}
            {activeType === "single" ? "single" : "average"}
          </span>
          <a
            href={rankingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ams-heading font-bold uppercase tracking-[0.08em] text-white/62 transition-colors hover:text-[var(--ams-orange)]"
          >
            Fuente completa
          </a>
        </div>
      </div>
    </section>
  );
}
