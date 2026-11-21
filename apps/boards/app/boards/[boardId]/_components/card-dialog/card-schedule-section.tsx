"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  estimateRoundPlan,
  GROUP_COMPETITORS_PER_STATION,
} from "@workspace/db/competition-format-rules";
import {
  CATEGORIES_CARD_TITLE,
  COMPETITION_DETAILS_CARD_TITLE,
} from "@workspace/db/data/ams-board-template";
import {
  estimateRoundDurationMinutes,
  getHorarioEventEstimate,
  horarioEstimateCorpusLabel,
} from "@workspace/db/horario-estimates";
import { Badge } from "@workspace/ui/components/badge";

import {
  loadCategoriesScheduleCard,
  type CategoriesScheduleData,
} from "../../_actions/categories-schedule-actions";
import type { BoardDetail } from "../../_lib/types";
import { WcaEventLabel } from "./wca-event-label";

export function CardScheduleSection({
  board,
  cardId,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const [data, setData] = React.useState<CategoriesScheduleData | null>();

  React.useEffect(() => {
    if (!board.competition) return;
    let cancelled = false;
    loadCategoriesScheduleCard({ boardId: board.id, cardId })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setData(result.data);
        else {
          setData(null);
          toast.error(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          toast.error("No se pudo cargar el horario");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [board.competition, board.id, cardId]);

  if (!board.competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Cálculo de rondas</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia.
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Cálculo de rondas</h3>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Cálculo de rondas</h3>
        <p className="text-muted-foreground text-sm">
          No se pudo cargar el formato de la competencia.
        </p>
      </section>
    );
  }

  const stations = data.format.stationCount;
  const eventsById = new Map(data.events.map((event) => [event.id, event]));
  const plan = data.format.eventsPlan;
  const regionId = data.regionId;
  const corpusLabel = horarioEstimateCorpusLabel(regionId);

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Cálculo de rondas</h3>
        <p className="text-muted-foreground text-sm">
          Grupos ≈ ceil(competidores / ({GROUP_COMPETITORS_PER_STATION} ×
          estaciones)), empaquetando más de un competidor por estación. Rondas
          siguientes acotadas por WCA 9m; intermedias usan el techo 9p (máx.
          75%) y la final suele igualar el número de estaciones. Duración
          estimada a partir de horarios WCIF recientes ({corpusLabel}; slots
          programados). Completa el formato en{" "}
          <span className="font-medium">{CATEGORIES_CARD_TITLE}</span>
          {stations == null ? (
            <>
              {" "}
              y define estaciones ahí o en{" "}
              <span className="font-medium">
                {COMPETITION_DETAILS_CARD_TITLE}
              </span>
            </>
          ) : null}
          .
        </p>
      </div>

      {stations == null ? (
        <p className="text-muted-foreground text-sm">
          Sin estaciones no se calculan grupos.
        </p>
      ) : (
        <p className="text-sm">
          Estaciones: <span className="font-semibold">{stations}</span>
        </p>
      )}

      {plan.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aún no hay categorías en{" "}
          <span className="font-medium">{CATEGORIES_CARD_TITLE}</span>.
        </p>
      ) : (
        <ul className="space-y-3">
          {plan.map((item) => {
            const event = eventsById.get(item.eventId);
            const packSize = getHorarioEventEstimate(item.eventId, {
              regionId,
            })?.estimate.medianCompetitorsPerGroup;
            const rounds = estimateRoundPlan({
              expectedCompetitors: item.expectedCompetitors,
              rounds: item.rounds,
              stationCount: stations,
              eventId: item.eventId,
              medianCompetitorsPerGroup: packSize,
              estimateDurationMinutes: (args) =>
                estimateRoundDurationMinutes({ ...args, regionId }),
            });
            const hasBreach = rounds.some(
              (round) => round.exceedsSubsequentLimit,
            );
            return (
              <li
                key={item.eventId}
                className="space-y-2 rounded-md border px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {event ? (
                    <WcaEventLabel event={event} />
                  ) : (
                    <span className="font-medium">{item.eventId}</span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {item.rounds} ronda{item.rounds === 1 ? "" : "s"} planeada
                    {item.rounds === 1 ? "" : "s"}
                  </span>
                  {hasBreach ? (
                    <Badge variant="outline">Revisa 9m</Badge>
                  ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-xs">
                        <th className="py-1 pr-3 font-medium">Ronda</th>
                        <th className="py-1 pr-3 font-medium">
                          Competidores
                          {item.rounds > 1 ? " (9p / final≈est.)" : ""}
                        </th>
                        <th className="py-1 pr-3 font-medium">Grupos</th>
                        <th className="py-1 pr-3 font-medium">Duración est.</th>
                        <th className="py-1 font-medium">Máx. siguientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((round) => (
                        <tr
                          key={round.roundNumber}
                          className={
                            round.exceedsSubsequentLimit
                              ? "bg-destructive/5"
                              : undefined
                          }
                        >
                          <td className="py-1.5 pr-3">{round.roundNumber}</td>
                          <td className="py-1.5 pr-3">
                            {round.competitors}
                            {round.roundNumber > 1 ? (
                              <span className="text-muted-foreground text-xs">
                                {" "}
                                máx.
                              </span>
                            ) : null}
                          </td>
                          <td className="py-1.5 pr-3">
                            {round.groups == null ? "—" : round.groups}
                          </td>
                          <td className="py-1.5 pr-3">
                            {round.estimatedMinutes == null
                              ? "—"
                              : `${round.estimatedMinutes} min`}
                          </td>
                          <td className="py-1.5">
                            {round.maxSubsequent}
                            {round.exceedsSubsequentLimit ? (
                              <span className="text-destructive ml-1 text-xs">
                                (excede 9m)
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
