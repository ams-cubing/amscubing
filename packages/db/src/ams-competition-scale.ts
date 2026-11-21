/**
 * AMS organizer experience + delegate tabuladores.
 * Tier is the stricter of cupo vs estaciones.
 */

import type { AmsCompetitionTierStored } from "./schema/ams-scale";

export type { AmsCompetitionTierStored };

export type AmsCompetitionTier = {
  level: string;
  labelEs: string;
  /** Inclusive upper bound for competitor capacity (Infinity for open-ended). */
  maxCompetitors: number;
  /** Inclusive upper bound for stations at this tier. */
  maxStations: number;
  maxEvents: number;
  /** Suggested minimum delegates; last open tier may be "N+". */
  minDelegates: number;
  delegatesOpenEnded: boolean;
  minOrganizerCompetitions: number;
};

export const DEFAULT_AMS_COMPETITION_TIERS: readonly AmsCompetitionTier[] = [
  {
    level: "debutante",
    labelEs: "Debutante",
    maxCompetitors: 80,
    maxStations: 8,
    maxEvents: 7,
    minDelegates: 1,
    delegatesOpenEnded: false,
    minOrganizerCompetitions: 1,
  },
  {
    level: "super",
    labelEs: "Super",
    maxCompetitors: 120,
    maxStations: 10,
    maxEvents: 9,
    minDelegates: 1,
    delegatesOpenEnded: false,
    minOrganizerCompetitions: 2,
  },
  {
    level: "experto",
    labelEs: "Experto",
    maxCompetitors: 180,
    maxStations: 16,
    maxEvents: 12,
    minDelegates: 2,
    delegatesOpenEnded: false,
    minOrganizerCompetitions: 3,
  },
  {
    level: "maestro",
    labelEs: "Maestro",
    maxCompetitors: 240,
    maxStations: 20,
    maxEvents: 15,
    minDelegates: 3,
    delegatesOpenEnded: false,
    minOrganizerCompetitions: 5,
  },
  {
    level: "leyenda",
    labelEs: "Leyenda",
    maxCompetitors: Number.POSITIVE_INFINITY,
    maxStations: Number.POSITIVE_INFINITY,
    maxEvents: 17,
    minDelegates: 4,
    delegatesOpenEnded: true,
    minOrganizerCompetitions: 6,
  },
];

/** @deprecated Prefer DEFAULT_AMS_COMPETITION_TIERS */
export const AMS_COMPETITION_TIERS = DEFAULT_AMS_COMPETITION_TIERS;

export type CompetitionScale = AmsCompetitionTier & {
  /** Index in the tiers array (0-based). */
  index: number;
  stationsOverGuidance: boolean;
};

export class AmsCompetitionScaleError extends Error {}

export function serializeScaleTiers(
  tiers: readonly AmsCompetitionTier[],
): AmsCompetitionTierStored[] {
  return tiers.map((tier) => ({
    level: tier.level,
    labelEs: tier.labelEs,
    maxCompetitors: Number.isFinite(tier.maxCompetitors)
      ? tier.maxCompetitors
      : null,
    maxStations: Number.isFinite(tier.maxStations) ? tier.maxStations : null,
    maxEvents: tier.maxEvents,
    minDelegates: tier.minDelegates,
    delegatesOpenEnded: tier.delegatesOpenEnded,
    minOrganizerCompetitions: tier.minOrganizerCompetitions,
  }));
}

export function deserializeScaleTiers(
  tiers: AmsCompetitionTierStored[],
): AmsCompetitionTier[] {
  return tiers.map((tier) => ({
    level: tier.level,
    labelEs: tier.labelEs,
    maxCompetitors:
      tier.maxCompetitors == null
        ? Number.POSITIVE_INFINITY
        : tier.maxCompetitors,
    maxStations:
      tier.maxStations == null ? Number.POSITIVE_INFINITY : tier.maxStations,
    maxEvents: tier.maxEvents,
    minDelegates: tier.minDelegates,
    delegatesOpenEnded: tier.delegatesOpenEnded,
    minOrganizerCompetitions: tier.minOrganizerCompetitions,
  }));
}

function slugifyLevel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function normalizeScaleTiers(
  input: unknown,
): AmsCompetitionTier[] {
  if (!Array.isArray(input)) {
    throw new AmsCompetitionScaleError("Los tabuladores deben ser una lista");
  }
  if (input.length < 3 || input.length > 10) {
    throw new AmsCompetitionScaleError(
      "Debe haber entre 3 y 10 niveles en el tabulador",
    );
  }

  const levels = new Set<string>();
  const tiers: AmsCompetitionTier[] = [];

  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i];
    if (!raw || typeof raw !== "object") {
      throw new AmsCompetitionScaleError(`Nivel ${i + 1} inválido`);
    }
    const row = raw as Record<string, unknown>;
    const labelEs = String(row.labelEs ?? "").trim();
    if (labelEs.length < 1 || labelEs.length > 40) {
      throw new AmsCompetitionScaleError(
        `Nombre de nivel inválido en la fila ${i + 1}`,
      );
    }
    const levelRaw = String(row.level ?? "").trim() || slugifyLevel(labelEs);
    const level = slugifyLevel(levelRaw) || `nivel-${i + 1}`;
    if (levels.has(level)) {
      throw new AmsCompetitionScaleError(`Nivel duplicado: ${level}`);
    }
    levels.add(level);

    const isLast = i === input.length - 1;
    let maxCompetitors: number;
    let maxStations: number;
    if (isLast) {
      maxCompetitors = Number.POSITIVE_INFINITY;
      maxStations = Number.POSITIVE_INFINITY;
    } else {
      const competitors = normalizeBound(
        row.maxCompetitors,
        `competidores (fila ${i + 1})`,
        { allowNull: false },
      );
      const stations = normalizeBound(
        row.maxStations,
        `estaciones (fila ${i + 1})`,
        { allowNull: false },
      );
      if (competitors == null || stations == null) {
        throw new AmsCompetitionScaleError(
          `La fila ${i + 1} debe tener tope de competidores y estaciones`,
        );
      }
      maxCompetitors = competitors;
      maxStations = stations;
    }

    const maxEvents = normalizePositiveInt(
      row.maxEvents,
      `categorías máx. (fila ${i + 1})`,
      50,
    );
    const minDelegates = normalizePositiveInt(
      row.minDelegates,
      `delegados (fila ${i + 1})`,
      20,
    );
    const minOrganizerCompetitions = normalizePositiveInt(
      row.minOrganizerCompetitions,
      `experiencia (fila ${i + 1})`,
      50,
    );
    const delegatesOpenEnded =
      typeof row.delegatesOpenEnded === "boolean"
        ? row.delegatesOpenEnded
        : isLast;

    tiers.push({
      level,
      labelEs,
      maxCompetitors,
      maxStations,
      maxEvents,
      minDelegates,
      delegatesOpenEnded,
      minOrganizerCompetitions,
    });
  }

  for (let i = 1; i < tiers.length - 1; i += 1) {
    if (tiers[i]!.maxCompetitors <= tiers[i - 1]!.maxCompetitors) {
      throw new AmsCompetitionScaleError(
        "Los topes de competidores deben ir en orden ascendente",
      );
    }
    if (tiers[i]!.maxStations <= tiers[i - 1]!.maxStations) {
      throw new AmsCompetitionScaleError(
        "Los topes de estaciones deben ir en orden ascendente",
      );
    }
  }

  return tiers;
}

function normalizeBound(
  value: unknown,
  label: string,
  options: { allowNull: boolean },
): number | null {
  if (value == null || value === "") {
    if (options.allowNull) return null;
    throw new AmsCompetitionScaleError(`Falta ${label}`);
  }
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 10_000) {
    throw new AmsCompetitionScaleError(`Valor inválido para ${label}`);
  }
  return n;
}

function normalizePositiveInt(
  value: unknown,
  label: string,
  max: number,
): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > max) {
    throw new AmsCompetitionScaleError(`Valor inválido para ${label}`);
  }
  return n;
}

function tierIndexByCompetitors(
  capacity: number,
  tiers: readonly AmsCompetitionTier[],
): number {
  const value = Math.max(1, Math.floor(capacity));
  const index = tiers.findIndex((tier) => value <= tier.maxCompetitors);
  return index === -1 ? tiers.length - 1 : index;
}

function tierIndexByStations(
  stationCount: number,
  tiers: readonly AmsCompetitionTier[],
): number {
  const value = Math.max(0, Math.floor(stationCount));
  const index = tiers.findIndex(
    (tier, i) =>
      i === tiers.length - 1 || value <= tier.maxStations,
  );
  return index === -1 ? tiers.length - 1 : index;
}

/**
 * Highest AMS tier whose `minOrganizerCompetitions` the organizer count meets.
 * `count` is typically WCA-organized comps in Mexico over the last two years.
 */
export function resolveOrganizerExperienceLevel(input: {
  organizedCount: number;
  tiers?: readonly AmsCompetitionTier[];
}): { index: number; tier: AmsCompetitionTier } {
  const tiers =
    input.tiers && input.tiers.length > 0
      ? input.tiers
      : DEFAULT_AMS_COMPETITION_TIERS;
  const count = Math.max(0, Math.floor(input.organizedCount));
  let index = 0;
  for (let i = 0; i < tiers.length; i += 1) {
    if (count >= tiers[i]!.minOrganizerCompetitions) {
      index = i;
    }
  }
  return { index, tier: tiers[index]! };
}

/**
 * Resolve the AMS scale tier for a competition from cupo and (optional) estaciones.
 * Uses the stricter of the two dimensions.
 */
export function resolveCompetitionScale(input: {
  capacity: number;
  stationCount: number | null;
  tiers?: readonly AmsCompetitionTier[];
}): CompetitionScale {
  const tiers =
    input.tiers && input.tiers.length > 0
      ? input.tiers
      : DEFAULT_AMS_COMPETITION_TIERS;
  const byCapacity = tierIndexByCompetitors(input.capacity, tiers);
  const byStations =
    input.stationCount == null
      ? byCapacity
      : tierIndexByStations(input.stationCount, tiers);
  const index = Math.max(byCapacity, byStations);
  const tier = tiers[index]!;

  const stationsOverGuidance =
    input.stationCount != null &&
    Number.isFinite(tier.maxStations) &&
    input.stationCount > tier.maxStations;

  return {
    ...tier,
    index,
    stationsOverGuidance,
  };
}

export function formatDelegatesLabel(scale: {
  minDelegates: number;
  delegatesOpenEnded: boolean;
}): string {
  return scale.delegatesOpenEnded
    ? `${scale.minDelegates}+`
    : String(scale.minDelegates);
}

/** Competitor band label as on the AMS tables (e.g. "81-120", "241+"). */
export function formatCompetitorsBand(
  tier: AmsCompetitionTier,
  index: number,
  tiers: readonly AmsCompetitionTier[] = DEFAULT_AMS_COMPETITION_TIERS,
): string {
  const prevMax = index === 0 ? 0 : tiers[index - 1]!.maxCompetitors;
  const from = prevMax + 1;
  if (!Number.isFinite(tier.maxCompetitors)) {
    return `${from}+`;
  }
  return `${from}-${tier.maxCompetitors}`;
}

/** Station band label (e.g. "8", "10", "21+"). */
export function formatStationsBand(
  tier: AmsCompetitionTier,
  previousMaxStations?: number,
): string {
  if (!Number.isFinite(tier.maxStations)) {
    if (
      previousMaxStations != null &&
      Number.isFinite(previousMaxStations) &&
      previousMaxStations >= 1
    ) {
      return `${previousMaxStations + 1}+`;
    }
    return "∞";
  }
  return String(tier.maxStations);
}
