"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deserializeScaleTiers,
  resolveCompetitionScale,
} from "@workspace/db/ams-competition-scale";
import type { CompetitionEventPlanItem } from "@workspace/db/competition-format";
import {
  defaultTimeLimitCs,
  isTimeLimitEditable,
  maxRoundsAllowed,
  recommendedScramblers,
  recommendedStaffMinimum,
} from "@workspace/db/competition-format-rules";
import { COMPETITION_DETAILS_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  centisecondsToDigits,
  digitsToCentiseconds,
} from "@/lib/digit-time";

import {
  loadCategoriesScheduleCard,
  saveCategoriesScheduleFromCard,
  type CategoriesScheduleData,
} from "../../_actions/categories-schedule-actions";
import type { BoardDetail } from "../../_lib/types";
import { DigitTimeInput } from "./digit-time-input";
import { WcaEventIcon, WcaEventLabel } from "./wca-event-label";

function defaultTimeLimitDigits(eventId: string): string {
  return centisecondsToDigits(defaultTimeLimitCs(eventId));
}

type EventDraft = {
  selected: boolean;
  expectedCompetitors: string;
  rounds: string;
  /** Digit-pad digits for cutoff (Cubing México style). */
  cutoffDigits: string;
  /** Digit-pad digits for time limit. */
  timeLimitDigits: string;
};

function draftsFrom(data: CategoriesScheduleData): Record<string, EventDraft> {
  const map: Record<string, EventDraft> = {};
  const byId = new Map(
    data.format.eventsPlan.map((event) => [event.eventId, event]),
  );
  for (const event of data.events) {
    const existing = byId.get(event.id);
    const defaultExpected =
      event.id === "333" || event.id === "222"
        ? String(data.capacity)
        : "";
    map[event.id] = {
      selected: Boolean(existing),
      expectedCompetitors: existing
        ? String(existing.expectedCompetitors)
        : defaultExpected,
      rounds: existing ? String(existing.rounds) : "1",
      cutoffDigits:
        existing?.cutoffCs == null
          ? ""
          : centisecondsToDigits(existing.cutoffCs),
      timeLimitDigits: !isTimeLimitEditable(event.id)
        ? defaultTimeLimitDigits(event.id)
        : existing
          ? existing.timeLimitCs == null
            ? ""
            : centisecondsToDigits(existing.timeLimitCs)
          : defaultTimeLimitDigits(event.id),
    };
  }
  return map;
}

function parseDraftTime(
  digits: string,
  label: string,
  eventId: string,
): number | null | { error: string } {
  const parsed = digitsToCentiseconds(digits);
  if (parsed === "invalid") {
    return {
      error: `${label} inválido en ${eventId} (usa solo números, p. ej. 50000 = 5:00.00)`,
    };
  }
  return parsed;
}

function buildPlan(
  drafts: Record<string, EventDraft>,
  capacity: number,
): CompetitionEventPlanItem[] | { error: string } {
  const plan: CompetitionEventPlanItem[] = [];
  for (const [eventId, draft] of Object.entries(drafts)) {
    if (!draft.selected) continue;
    const expectedCompetitors = Number(draft.expectedCompetitors);
    const rounds = Number(draft.rounds);
    if (
      !Number.isFinite(expectedCompetitors) ||
      expectedCompetitors < 0 ||
      !Number.isInteger(expectedCompetitors)
    ) {
      return { error: `Competidores inválidos en ${eventId}` };
    }
    if (expectedCompetitors > capacity) {
      return {
        error: `Esperados en ${eventId} no pueden superar el cupo (${capacity})`,
      };
    }
    if (!Number.isFinite(rounds) || rounds < 1 || rounds > 4) {
      return { error: `Rondas inválidas en ${eventId}` };
    }
    const allowed = maxRoundsAllowed(expectedCompetitors);
    if (rounds > allowed) {
      return {
        error: `Con ${expectedCompetitors} esperados en ${eventId}, 9m permite máximo ${allowed} ${allowed === 1 ? "ronda" : "rondas"}`,
      };
    }
    const cutoffCs = parseDraftTime(draft.cutoffDigits, "Corte", eventId);
    if (cutoffCs && typeof cutoffCs === "object" && "error" in cutoffCs) {
      return cutoffCs;
    }
    const timeLimitCs = isTimeLimitEditable(eventId)
      ? parseDraftTime(draft.timeLimitDigits, "Límite", eventId)
      : defaultTimeLimitCs(eventId);
    if (
      timeLimitCs &&
      typeof timeLimitCs === "object" &&
      "error" in timeLimitCs
    ) {
      return timeLimitCs;
    }
    plan.push({
      eventId,
      expectedCompetitors,
      rounds,
      cutoffCs: cutoffCs as number | null,
      timeLimitCs: timeLimitCs as number | null,
    });
  }
  return plan;
}

export function CardCategoriesSection({
  board,
  cardId,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = React.useState<CategoriesScheduleData | null>();
  const [stationCount, setStationCount] = React.useState("");
  const [zoneCount, setZoneCount] = React.useState("1");
  const [drafts, setDrafts] = React.useState<Record<string, EventDraft>>({});
  const [pending, startTransition] = React.useTransition();

  const apply = React.useCallback((next: CategoriesScheduleData | null) => {
    setData(next);
    if (!next) return;
    setStationCount(
      next.format.stationCount == null ? "" : String(next.format.stationCount),
    );
    setZoneCount(String(next.format.zoneCount));
    setDrafts(draftsFrom(next));
  }, []);

  React.useEffect(() => {
    if (!board.competition) return;
    let cancelled = false;
    loadCategoriesScheduleCard({ boardId: board.id, cardId })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) apply(result.data);
        else {
          setData(null);
          toast.error(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          toast.error("No se pudo cargar categorías");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apply, board.competition, board.id, cardId]);

  if (!board.competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Categorías</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia.
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Categorías</h3>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Categorías</h3>
        <p className="text-muted-foreground text-sm">
          No se pudo cargar el formato de la competencia.
        </p>
      </section>
    );
  }

  const editable = !readOnly && !pending;
  const selectedIds = Object.entries(drafts)
    .filter(([, draft]) => draft.selected)
    .map(([eventId]) => eventId);
  const selectedCount = selectedIds.length;
  const liveStations = stationCount.trim() ? Number(stationCount) : null;
  const liveZones = Number(zoneCount);
  const liveStaffMinimum =
    liveStations != null &&
    Number.isInteger(liveStations) &&
    liveStations >= 1 &&
    Number.isInteger(liveZones) &&
    liveZones >= 1
      ? recommendedStaffMinimum({
          stationCount: liveStations,
          zoneCount: liveZones,
        })
      : null;
  const liveScramblers = recommendedScramblers({
    capacity: data.capacity,
    eventIds: selectedIds,
  });
  const tiers = deserializeScaleTiers(data.tiers);
  const liveScale = resolveCompetitionScale({
    capacity: data.capacity,
    stationCount:
      liveStations != null && Number.isInteger(liveStations) && liveStations >= 1
        ? liveStations
        : data.format.stationCount,
    tiers,
  });
  const eventsOverMax = selectedCount > liveScale.maxEvents;

  function updateDraft(eventId: string, patch: Partial<EventDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId]!, ...patch },
    }));
  }

  function save() {
    if (!data) return;
    const capacity = data.capacity;
    const plan = buildPlan(drafts, capacity);
    if ("error" in plan) {
      toast.error(plan.error);
      return;
    }

    let stations: number | null = null;
    if (stationCount.trim()) {
      stations = Number(stationCount);
      if (!Number.isInteger(stations) || stations < 1 || stations > 200) {
        toast.error("Estaciones inválidas (1–200)");
        return;
      }
    }

    const zones = Number(zoneCount);
    if (!Number.isInteger(zones) || zones < 1 || zones > 20) {
      toast.error("Zonas inválidas (1–20)");
      return;
    }

    startTransition(async () => {
      const result = await saveCategoriesScheduleFromCard({
        boardId: board.id,
        cardId,
        stationCount: stations,
        zoneCount: zones,
        eventsPlan: plan,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      apply(result.data);
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Formato técnico</h3>
        <p className="text-muted-foreground text-sm">
          Define estaciones, zonas y categorías antes del anuncio. Cupo y
          estaciones también se editan en{" "}
          <span className="font-medium">{COMPETITION_DETAILS_CARD_TITLE}</span>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="station-count">Estaciones</Label>
          <Input
            id="station-count"
            type="number"
            min={1}
            max={200}
            inputMode="numeric"
            placeholder="p. ej. 8"
            value={stationCount}
            disabled={!editable}
            onChange={(event) => setStationCount(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zone-count">Zonas</Label>
          <Input
            id="zone-count"
            type="number"
            min={1}
            max={20}
            inputMode="numeric"
            value={zoneCount}
            disabled={!editable}
            onChange={(event) => setZoneCount(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Categorías</Label>
          <span className="text-muted-foreground text-xs">
            {selectedCount} seleccionada{selectedCount === 1 ? "" : "s"} · cupo{" "}
            {data.capacity}
          </span>
        </div>
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {data.events.map((event) => {
            const draft = drafts[event.id];
            if (!draft) return null;
            const expected = Number(draft.expectedCompetitors);
            const roundMax = Number.isFinite(expected)
              ? maxRoundsAllowed(expected)
              : 4;
            return (
              <li
                key={event.id}
                className="space-y-2 rounded-md border px-3 py-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.selected}
                    disabled={!editable}
                    onCheckedChange={(checked) =>
                      updateDraft(event.id, {
                        selected: checked === true,
                        expectedCompetitors:
                          draft.expectedCompetitors ||
                          (event.id === "333" || event.id === "222"
                            ? String(data.capacity)
                            : draft.expectedCompetitors),
                        timeLimitDigits:
                          !isTimeLimitEditable(event.id) ||
                          !draft.timeLimitDigits
                            ? defaultTimeLimitDigits(event.id)
                            : draft.timeLimitDigits,
                      })
                    }
                  />
                  <WcaEventLabel event={event} />
                </label>
                {draft.selected ? (
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Esperados</Label>
                      <Input
                        type="number"
                        min={0}
                        max={data.capacity}
                        inputMode="numeric"
                        value={draft.expectedCompetitors}
                        disabled={!editable}
                        onChange={(change) => {
                          const raw = change.target.value;
                          if (raw === "") {
                            updateDraft(event.id, {
                              expectedCompetitors: "",
                            });
                            return;
                          }
                          const value = Number(raw);
                          if (!Number.isFinite(value)) return;
                          const nextExpected = Math.min(
                            data.capacity,
                            Math.max(0, Math.floor(value)),
                          );
                          const allowed = maxRoundsAllowed(nextExpected);
                          const currentRounds = Number(draft.rounds);
                          updateDraft(event.id, {
                            expectedCompetitors: String(nextExpected),
                            rounds:
                              Number.isFinite(currentRounds) &&
                              currentRounds > allowed
                                ? String(allowed)
                                : draft.rounds,
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rondas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={roundMax}
                        inputMode="numeric"
                        value={draft.rounds}
                        disabled={!editable}
                        onChange={(change) => {
                          const raw = change.target.value;
                          if (raw === "") {
                            updateDraft(event.id, { rounds: "" });
                            return;
                          }
                          const value = Number(raw);
                          if (!Number.isFinite(value)) return;
                          updateDraft(event.id, {
                            rounds: String(
                              Math.min(
                                roundMax,
                                Math.max(1, Math.floor(value)),
                              ),
                            ),
                          });
                        }}
                      />
                      <p className="text-muted-foreground text-[11px]">
                        Máx. {roundMax} (9m)
                      </p>
                    </div>
                    <DigitTimeInput
                      id={`cutoff-${event.id}`}
                      label="Corte"
                      placeholder="ej. 50000 = 5:00.00"
                      digits={draft.cutoffDigits}
                      disabled={!editable}
                      onDigitsChange={(cutoffDigits) =>
                        updateDraft(event.id, { cutoffDigits })
                      }
                    />
                    <DigitTimeInput
                      id={`limit-${event.id}`}
                      label="Límite"
                      placeholder="ej. 100000 = 10:00.00"
                      digits={draft.timeLimitDigits}
                      disabled={!editable || !isTimeLimitEditable(event.id)}
                      hint={
                        isTimeLimitEditable(event.id)
                          ? undefined
                          : "Fijo en 60:00.00"
                      }
                      onDigitsChange={(timeLimitDigits) =>
                        updateDraft(event.id, { timeLimitDigits })
                      }
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-muted/40 space-y-2 rounded-md p-3 text-sm">
        <p className="font-medium">Recomendaciones de staff</p>
        {liveStaffMinimum == null ? (
          <p className="text-muted-foreground">
            Indica el número de estaciones para calcular el mínimo (estaciones +
            4, +4 por zona extra).
          </p>
        ) : (
          <p>
            Mínimo recomendado:{" "}
            <span className="font-semibold">{liveStaffMinimum}</span> personas
          </p>
        )}
        <p>
          Mezcladores: mínimo{" "}
          <span className="font-semibold">{liveScramblers.count}</span>
          {data.capacity < 80
            ? " (menos de 80 competidores)"
            : " (80 o más competidores)"}
        </p>
        {liveScramblers.demoEventIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-xs">
              Requiere video de mezcladores:
            </span>
            {liveScramblers.demoEventIds.map((id) => {
              const event = data.events.find((item) => item.id === id);
              return (
                <Badge key={id} variant="outline" className="gap-1.5">
                  <WcaEventIcon eventId={id} className="text-sm leading-none" />
                  {event?.name ?? id}
                </Badge>
              );
            })}
          </div>
        ) : null}
        {eventsOverMax ? (
          <p className="text-xs">
            <Badge variant="outline">Demasiadas categorías</Badge>{" "}
            <span className="text-muted-foreground">
              El tabulador AMS para nivel {liveScale.labelEs} admite máximo{" "}
              {liveScale.maxEvents}. Ajusta cupo/estaciones en{" "}
              {COMPETITION_DETAILS_CARD_TITLE} o reduce la selección.
            </span>
          </p>
        ) : null}
      </div>

      {editable ? (
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar formato"}
        </Button>
      ) : null}
    </section>
  );
}

/** @deprecated Use CardCategoriesSection. */
export const CardCategoriesScheduleSection = CardCategoriesSection;
