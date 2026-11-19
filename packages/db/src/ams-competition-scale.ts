/**
 * AMS organizer experience + delegate tabuladores.
 * Tier is the stricter of cupo vs estaciones.
 */

export type AmsCompetitionLevel =
  | "debutante"
  | "super"
  | "experto"
  | "maestro"
  | "leyenda";

export type AmsCompetitionTier = {
  level: AmsCompetitionLevel;
  labelEs: string;
  /** Inclusive upper bound for competitor capacity (Infinity for open-ended). */
  maxCompetitors: number;
  /** Inclusive upper bound for stations at this tier. */
  maxStations: number;
  maxEvents: number;
  /** Suggested minimum delegates; Leyenda is "4+". */
  minDelegates: number;
  delegatesOpenEnded: boolean;
  minOrganizerCompetitions: number;
};

export const AMS_COMPETITION_TIERS: readonly AmsCompetitionTier[] = [
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
] as const;

export type CompetitionScale = AmsCompetitionTier & {
  /** Index in `AMS_COMPETITION_TIERS` (0-based). */
  index: number;
  /** True when stations exceed this tier's guidance band (only Leyenda can be open). */
  stationsOverGuidance: boolean;
};

function tierIndexByCompetitors(capacity: number): number {
  const value = Math.max(1, Math.floor(capacity));
  return AMS_COMPETITION_TIERS.findIndex(
    (tier) => value <= tier.maxCompetitors,
  );
}

function tierIndexByStations(stationCount: number): number {
  const value = Math.max(0, Math.floor(stationCount));
  // Sheet: Leyenda is "30+" — treat >30 as still Leyenda (last tier).
  return AMS_COMPETITION_TIERS.findIndex(
    (tier, index) =>
      index === AMS_COMPETITION_TIERS.length - 1 || value <= tier.maxStations,
  );
}

/**
 * Resolve the AMS scale tier for a competition from cupo and (optional) estaciones.
 * Uses the stricter of the two dimensions.
 */
export function resolveCompetitionScale(input: {
  capacity: number;
  stationCount: number | null;
}): CompetitionScale {
  const byCapacity = tierIndexByCompetitors(input.capacity);
  const byStations =
    input.stationCount == null
      ? byCapacity
      : tierIndexByStations(input.stationCount);
  const index = Math.max(byCapacity, byStations);
  const tier = AMS_COMPETITION_TIERS[index]!;

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
): string {
  const prevMax =
    index === 0 ? 0 : AMS_COMPETITION_TIERS[index - 1]!.maxCompetitors;
  const from = prevMax + 1;
  if (!Number.isFinite(tier.maxCompetitors)) {
    return `${from}+`;
  }
  return `${from}-${tier.maxCompetitors}`;
}

/** Station band label (e.g. "8", "10", "30+"). */
export function formatStationsBand(tier: AmsCompetitionTier): string {
  if (!Number.isFinite(tier.maxStations)) return "30+";
  return String(tier.maxStations);
}
