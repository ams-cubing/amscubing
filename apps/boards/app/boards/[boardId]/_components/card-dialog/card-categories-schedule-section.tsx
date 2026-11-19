"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { resolveCompetitionScale } from "@workspace/db/ams-competition-scale";
import type { CompetitionEventPlanItem } from "@workspace/db/competition-format";
import {
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
  loadCategoriesScheduleCard,
  saveCategoriesScheduleFromCard,
  type CategoriesScheduleData,
} from "../../_actions/categories-schedule-actions";
import type { BoardDetail } from "../../_lib/types";

function csToSecondsInput(cs: number | null): string {
  if (cs == null) return "";
  return String(Math.round(cs / 100));
}

function secondsInputToCs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.round(seconds * 100);
}

type EventDraft = {
  selected: boolean;
  expectedCompetitors: string;
  rounds: string;
  cutoffSeconds: string;
  timeLimitSeconds: string;
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
      cutoffSeconds: csToSecondsInput(existing?.cutoffCs ?? null),
      timeLimitSeconds: csToSecondsInput(existing?.timeLimitCs ?? null),
    };
  }
  return map;
}

function buildPlan(
  drafts: Record<string, EventDraft>,
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
    if (!Number.isFinite(rounds) || rounds < 1 || rounds > 4) {
      return { error: `Rondas inválidas en ${eventId}` };
    }
    const cutoffCs = secondsInputToCs(draft.cutoffSeconds);
    const timeLimitCs = secondsInputToCs(draft.timeLimitSeconds);
    if (draft.cutoffSeconds.trim() && cutoffCs == null) {
      return { error: `Corte inválido en ${eventId} (usa segundos)` };
    }
    if (draft.timeLimitSeconds.trim() && timeLimitCs == null) {
      return { error: `Límite inválido en ${eventId} (usa segundos)` };
    }
    plan.push({
      eventId,
      expectedCompetitors,
      rounds,
      cutoffCs,
      timeLimitCs,
    });
  }
  return plan;
}

export function CardCategoriesScheduleSection({
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
          toast.error("No se pudo cargar categorías y horario");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apply, board.competition, board.id, cardId]);

  if (!board.competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Categorías y horario</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia.
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Categorías y horario</h3>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Categorías y horario</h3>
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
  const liveScale = resolveCompetitionScale({
    capacity: data.capacity,
    stationCount:
      liveStations != null && Number.isInteger(liveStations) && liveStations >= 1
        ? liveStations
        : data.format.stationCount,
  });
  const eventsOverMax = selectedCount > liveScale.maxEvents;

  function updateDraft(eventId: string, patch: Partial<EventDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId]!, ...patch },
    }));
  }

  function save() {
    const plan = buildPlan(drafts);
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
          El horario detallado sigue en la plantilla de cálculo adjunta.
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
            return (
              <li
                key={event.id}
                className="space-y-2 rounded-md border px-3 py-2"
              >
                <label className="flex items-center gap-2 text-sm font-medium">
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
                      })
                    }
                  />
                  <span>{event.shortName}</span>
                  <span className="text-muted-foreground font-normal">
                    {event.name}
                  </span>
                </label>
                {draft.selected ? (
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Esperados</Label>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={draft.expectedCompetitors}
                        disabled={!editable}
                        onChange={(change) =>
                          updateDraft(event.id, {
                            expectedCompetitors: change.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rondas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={4}
                        inputMode="numeric"
                        value={draft.rounds}
                        disabled={!editable}
                        onChange={(change) =>
                          updateDraft(event.id, {
                            rounds: change.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Corte (s)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        inputMode="numeric"
                        placeholder="—"
                        value={draft.cutoffSeconds}
                        disabled={!editable}
                        onChange={(change) =>
                          updateDraft(event.id, {
                            cutoffSeconds: change.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Límite (s)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        inputMode="numeric"
                        placeholder="—"
                        value={draft.timeLimitSeconds}
                        disabled={!editable}
                        onChange={(change) =>
                          updateDraft(event.id, {
                            timeLimitSeconds: change.target.value,
                          })
                        }
                      />
                    </div>
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
            {liveScramblers.demoEventIds.map((id) => (
              <Badge key={id} variant="outline">
                {data.events.find((event) => event.id === id)?.shortName ?? id}
              </Badge>
            ))}
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
