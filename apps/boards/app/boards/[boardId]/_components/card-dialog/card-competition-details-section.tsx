"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deserializeScaleTiers,
  formatCompetitorsBand,
  formatDelegatesLabel,
  formatStationsBand,
  resolveCompetitionScale,
} from "@workspace/db/ams-competition-scale";
import {
  CATEGORIES_CARD_TITLE,
  STAFF_PLANNING_CARD_TITLE,
} from "@workspace/db/data/ams-board-template";
import {
  recommendedScramblers,
  recommendedStaffMinimum,
} from "@workspace/db/competition-format-rules";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  loadCompetitionDetailsCard,
  saveCompetitionDetailsFromCard,
  type CompetitionDetailsData,
} from "../../_actions/competition-details-actions";
import type { BoardDetail } from "../../_lib/types";
import { WcaEventIcon } from "./wca-event-label";

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeZone: "America/Mexico_City",
});

function formatDate(value: string) {
  return dateFormat.format(new Date(`${value}T12:00:00`));
}

function formatMaxStations(maxStations: number, previousMaxStations?: number) {
  if (Number.isFinite(maxStations)) return String(maxStations);
  if (
    previousMaxStations != null &&
    Number.isFinite(previousMaxStations) &&
    previousMaxStations >= 1
  ) {
    return `${previousMaxStations + 1}+`;
  }
  return "∞";
}

export function CardCompetitionDetailsSection({
  board,
  cardId,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = React.useState<CompetitionDetailsData | null>();
  const [name, setName] = React.useState("");
  const [nameReason, setNameReason] = React.useState("");
  const [capacity, setCapacity] = React.useState("50");
  const [stationCount, setStationCount] = React.useState("");
  const [mainEventId, setMainEventId] = React.useState("333");
  const [pending, startTransition] = React.useTransition();

  const apply = React.useCallback((next: CompetitionDetailsData | null) => {
    setData(next);
    if (!next) return;
    setName(next.name ?? "");
    setNameReason(next.nameReason ?? "");
    setCapacity(String(next.capacity));
    setStationCount(
      next.stationCount == null ? "" : String(next.stationCount),
    );
    setMainEventId(next.mainEventId ?? "333");
  }, []);

  React.useEffect(() => {
    if (!board.competition) return;
    let cancelled = false;
    loadCompetitionDetailsCard({ boardId: board.id, cardId })
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
          toast.error("No se pudieron cargar los detalles");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apply, board.competition, board.id, cardId]);

  if (!board.competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Detalles</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia.
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Detalles</h3>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Detalles</h3>
        <p className="text-muted-foreground text-sm">
          No se pudieron cargar los detalles de la competencia.
        </p>
      </section>
    );
  }

  const editable = !readOnly && !pending;
  const tiers = deserializeScaleTiers(data.tiers);
  const liveCapacity = Number(capacity);
  const liveStations = stationCount.trim() ? Number(stationCount) : null;
  const scaleReady =
    Number.isFinite(liveCapacity) &&
    liveCapacity >= 1 &&
    (liveStations == null ||
      (Number.isInteger(liveStations) && liveStations >= 1));
  const liveScale = scaleReady
    ? resolveCompetitionScale({
        capacity: liveCapacity,
        stationCount:
          liveStations != null && Number.isInteger(liveStations)
            ? liveStations
            : null,
        tiers,
      })
    : data.scale;
  const liveDelegatesLabel = formatDelegatesLabel(liveScale);
  const liveStaffMinimum =
    liveStations != null &&
    Number.isInteger(liveStations) &&
    liveStations >= 1 &&
    Number.isFinite(liveCapacity)
      ? recommendedStaffMinimum({
          stationCount: liveStations,
          zoneCount: data.zoneCount,
        })
      : null;
  const formatEventIds = (board.competition?.eventsPlan ?? []).map(
    (event) => event.eventId,
  );
  const liveScramblers = Number.isFinite(liveCapacity)
    ? recommendedScramblers({
        capacity: liveCapacity,
        eventIds: formatEventIds,
      }).count
    : data.recommendations.scramblers;
  const assignedDelegates = board.competition.delegates?.length ?? 0;
  const eventsOverMax = data.eventCount > liveScale.maxEvents;
  const stationsOverMax =
    liveStations != null &&
    Number.isFinite(liveScale.maxStations) &&
    liveStations > liveScale.maxStations;
  const delegatesShort = assignedDelegates < liveScale.minDelegates;
  const experience = data.organizerExperience;
  const experienceRequired = liveScale.minOrganizerCompetitions;
  const experienceMeets =
    experience.assessedCount == null
      ? null
      : experience.assessedCount >= experienceRequired;
  const experienceIndex = experience.experienceIndex;

  function save() {
    const nextCapacity = Number(capacity);
    if (!Number.isInteger(nextCapacity) || nextCapacity < 1) {
      toast.error("Cupo inválido");
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

    startTransition(async () => {
      const result = await saveCompetitionDetailsFromCard({
        boardId: board.id,
        cardId,
        name,
        nameReason,
        capacity: nextCapacity,
        stationCount: stations,
        mainEventId: mainEventId || null,
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
        <h3 className="text-sm font-semibold">Detalles</h3>
        <p className="text-muted-foreground text-sm">
          Cupo y estaciones se comparten con{" "}
          <span className="font-medium">{CATEGORIES_CARD_TITLE}</span>{" "}
          y {STAFF_PLANNING_CARD_TITLE}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="details-name">Nombre</Label>
          <Input
            id="details-name"
            value={name}
            maxLength={200}
            placeholder="Incluye ciudad, estado o sede"
            disabled={!editable}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="details-reason">Razón del nombre</Label>
          <Textarea
            id="details-reason"
            value={nameReason}
            maxLength={2000}
            rows={3}
            disabled={!editable}
            onChange={(event) => setNameReason(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="details-capacity">Número de competidores</Label>
          <Input
            id="details-capacity"
            type="number"
            min={1}
            max={5000}
            inputMode="numeric"
            value={capacity}
            disabled={!editable}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="details-stations">Estaciones</Label>
          <Input
            id="details-stations"
            type="number"
            min={1}
            max={200}
            inputMode="numeric"
            placeholder={`guía ≤ ${formatMaxStations(
              liveScale.maxStations,
              liveScale.index > 0
                ? tiers[liveScale.index - 1]?.maxStations
                : undefined,
            )}`}
            value={stationCount}
            disabled={!editable}
            onChange={(event) => setStationCount(event.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="details-main-event">Evento principal</Label>
          <div className="flex items-center gap-2">
            <WcaEventIcon
              eventId={mainEventId || "333"}
              className="text-xl leading-none"
            />
            <select
              id="details-main-event"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={mainEventId}
              disabled={!editable}
              onChange={(event) => setMainEventId(event.target.value)}
            >
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          {mainEventId !== "333" ? (
            <p className="text-muted-foreground text-xs">
              Si no es 3x3, explica el motivo en un comentario de esta tarjeta.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-3 text-sm">
        <div className="space-y-1">
          <p className="font-medium">Tabuladores AMS</p>
          <p className="text-muted-foreground text-xs">
            Nivel actual:{" "}
            <span className="text-foreground font-semibold">
              {liveScale.labelEs}
            </span>
            {" · "}
            delegados {liveDelegatesLabel}
            {assignedDelegates > 0
              ? ` (asignados: ${assignedDelegates})`
              : null}
            {" · "}
            categorías {data.eventCount}/{liveScale.maxEvents}
            {liveStations != null
              ? ` · estaciones ${liveStations}/${formatMaxStations(
                  liveScale.maxStations,
                  liveScale.index > 0
                    ? tiers[liveScale.index - 1]?.maxStations
                    : undefined,
                )}`
              : null}
          </p>
        </div>

        <div className="space-y-1.5 overflow-x-auto">
          <p className="text-xs font-semibold tracking-wide uppercase">
            Experiencia del organizador
          </p>
          <p className="text-muted-foreground text-xs">
            Competencias WCA en México organizadas en los últimos 2 años (
            {experience.windowStart} – {experience.windowEnd}). Requisito del
            nivel por cupo/estaciones:{" "}
            <span className="text-foreground font-medium">
              {experienceRequired}
            </span>
            {experience.assessedCount != null ? (
              <>
                {" · "}
                {experience.assessedOrganizerName ?? "Organizador"}:{" "}
                <span className="text-foreground font-medium">
                  {experience.assessedCount}
                </span>
                {experience.experienceLevel
                  ? ` (${experience.experienceLevel})`
                  : null}
              </>
            ) : !experience.countsAvailable ? (
              <> · no se pudo consultar la WCA</>
            ) : data.organizers.length === 0 ? (
              <> · sin organizadores asignados</>
            ) : (
              <> · ningún organizador tiene WCA ID</>
            )}
          </p>
          {data.organizers.length > 0 ? (
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              {data.organizers.map((organizer) => (
                <li key={`${organizer.name}-${organizer.wcaId ?? "none"}`}>
                  {organizer.name}
                  {organizer.isPrimary ? " (principal)" : null}
                  {organizer.wcaId ? ` · ${organizer.wcaId}` : " · sin WCA ID"}
                  {organizer.organizedCountLastTwoYears != null
                    ? ` · ${organizer.organizedCountLastTwoYears} comps`
                    : null}
                </li>
              ))}
            </ul>
          ) : null}
          <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-muted/60">
                <th className="border px-2 py-1.5 font-medium">
                  Núm. competencias
                </th>
                <th className="border px-2 py-1.5 font-medium">Competidores</th>
                <th className="border px-2 py-1.5 font-medium">Estaciones</th>
                <th className="border px-2 py-1.5 font-medium">
                  Categorías máx.
                </th>
                <th className="border px-2 py-1.5 font-medium">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, index) => {
                const sizeActive = index === liveScale.index;
                const experienceActive = experienceIndex === index;
                return (
                  <tr
                    key={tier.level}
                    className={
                      experienceActive
                        ? "bg-primary/10 font-medium"
                        : sizeActive
                          ? "bg-muted/40"
                          : undefined
                    }
                  >
                    <td className="border px-2 py-1.5">
                      {tier.minOrganizerCompetitions}
                    </td>
                    <td className="border px-2 py-1.5">
                      {formatCompetitorsBand(tier, index, tiers)}
                    </td>
                    <td className="border px-2 py-1.5">
                      {formatStationsBand(
                        tier,
                        index > 0 ? tiers[index - 1]!.maxStations : undefined,
                      )}
                    </td>
                    <td className="border px-2 py-1.5">{tier.maxEvents}</td>
                    <td className="border px-2 py-1.5">{tier.labelEs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5 overflow-x-auto">
          <p className="text-xs font-semibold tracking-wide uppercase">
            Delegados por competidores y estaciones
          </p>
          <table className="w-full min-w-[22rem] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-muted/60">
                <th className="border px-2 py-1.5 font-medium">Competidores</th>
                <th className="border px-2 py-1.5 font-medium">Estaciones</th>
                <th className="border px-2 py-1.5 font-medium">
                  Núm. de delegados
                </th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, index) => {
                const active = index === liveScale.index;
                return (
                  <tr
                    key={`delegates-${tier.level}`}
                    className={active ? "bg-primary/10 font-medium" : undefined}
                  >
                    <td className="border px-2 py-1.5">
                      {formatCompetitorsBand(tier, index, tiers)}
                    </td>
                    <td className="border px-2 py-1.5">
                      {formatStationsBand(
                        tier,
                        index > 0 ? tiers[index - 1]!.maxStations : undefined,
                      )}
                    </td>
                    <td className="border px-2 py-1.5">
                      {formatDelegatesLabel(tier)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {liveStaffMinimum == null ? (
          <p className="text-muted-foreground text-xs">
            Indica estaciones para ver el mínimo de staff (
            {STAFF_PLANNING_CARD_TITLE}).
          </p>
        ) : (
          <p className="text-xs">
            Staff mínimo estimado:{" "}
            <span className="font-semibold">{liveStaffMinimum}</span> ·
            mezcladores: <span className="font-semibold">{liveScramblers}</span>
            {" · "}
            eventos en {CATEGORIES_CARD_TITLE}: {data.eventCount}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {delegatesShort ? (
            <Badge variant="outline">
              Faltan delegados según el tabulador
            </Badge>
          ) : null}
          {experienceMeets === false ? (
            <Badge variant="outline">
              Experiencia de organizador por debajo del tabulador
            </Badge>
          ) : null}
          {stationsOverMax ? (
            <Badge variant="outline">
              Estaciones por encima de la guía del nivel
            </Badge>
          ) : null}
          {eventsOverMax ? (
            <Badge variant="outline">
              Más categorías que el máximo del nivel
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">
          Fechas: {formatDate(data.startDate)}
          {data.startDate !== data.endDate
            ? ` – ${formatDate(data.endDate)}`
            : null}
          {" · "}
          {data.city}
          {data.stateName ? ` · ${data.stateName}` : null}
        </p>
      </div>

      {editable ? (
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar detalles"}
        </Button>
      ) : null}
    </section>
  );
}
