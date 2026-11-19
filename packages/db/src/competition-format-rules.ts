import type { CompetitionEventPlanItem } from "./schema/competitions";

export type WcaEvent = {
  id: string;
  /** Display name aligned with Cubing México (Spanish where they use it). */
  name: string;
  supportsAverage: boolean;
};

/**
 * Official WCA events used when planning categorías.
 * Names follow Cubing México (`www.cubingmexico.net`); icons use `@cubing/icons`
 * (`cubing-icon event-{id}`) — the API has no events catalog.
 */
export const WCA_EVENTS: readonly WcaEvent[] = [
  { id: "333", name: "Cubo 3x3x3", supportsAverage: true },
  { id: "222", name: "Cubo 2x2x2", supportsAverage: true },
  { id: "444", name: "Cubo 4x4x4", supportsAverage: true },
  { id: "555", name: "Cubo 5x5x5", supportsAverage: true },
  { id: "666", name: "Cubo 6x6x6", supportsAverage: true },
  { id: "777", name: "Cubo 7x7x7", supportsAverage: true },
  { id: "333bf", name: "3x3x3 Blindfolded", supportsAverage: true },
  { id: "333fm", name: "3x3x3 Fewest Moves", supportsAverage: true },
  { id: "333oh", name: "3x3x3 One-Handed", supportsAverage: true },
  { id: "clock", name: "Clock", supportsAverage: true },
  { id: "minx", name: "Megaminx", supportsAverage: true },
  { id: "pyram", name: "Pyraminx", supportsAverage: true },
  { id: "skewb", name: "Skewb", supportsAverage: true },
  { id: "sq1", name: "Square-1", supportsAverage: true },
  { id: "fto", name: "Face-Turning Octahedron", supportsAverage: true },
  { id: "444bf", name: "4x4x4 Blindfolded", supportsAverage: true },
  { id: "555bf", name: "5x5x5 Blindfolded", supportsAverage: true },
  { id: "333mbf", name: "3x3x3 Multi-Blind", supportsAverage: false },
] as const;

/**
 * Events whose `@cubing/icons` glyph still lives under `unofficial-*`
 * (FTO is WCA-official but the font has not moved it yet).
 */
const UNOFFICIAL_ICON_EVENT_IDS = new Set(["fto"]);

/** CSS class for the WCA event icon font (`@cubing/icons`). */
export function wcaEventIconClass(eventId: string): string {
  const prefix = UNOFFICIAL_ICON_EVENT_IDS.has(eventId)
    ? "unofficial"
    : "event";
  return `cubing-icon ${prefix}-${eventId}`;
}

const WCA_EVENT_IDS = new Set(WCA_EVENTS.map((event) => event.id));

/** Events that require a scrambler efficiency demo per AMS staff guidance. */
export const SCRAMBLER_DEMO_EVENT_IDS = [
  "555",
  "sq1",
  "minx",
  "clock",
  "skewb",
] as const;

export function listWcaEvents(): readonly WcaEvent[] {
  return WCA_EVENTS;
}

export function isWcaEventId(value: string): boolean {
  return WCA_EVENT_IDS.has(value);
}

export function recommendedStaffMinimum(input: {
  stationCount: number;
  zoneCount: number;
}): number {
  const stations = Math.max(0, Math.floor(input.stationCount));
  const zones = Math.max(1, Math.floor(input.zoneCount));
  return stations + 4 + 4 * Math.max(0, zones - 1);
}

export function recommendedScramblers(input: {
  capacity: number;
  eventIds: readonly string[];
}): { count: number; demoEventIds: string[] } {
  const demoEventIds = SCRAMBLER_DEMO_EVENT_IDS.filter((id) =>
    input.eventIds.includes(id),
  );
  return {
    count: input.capacity < 80 ? 2 : 4,
    demoEventIds: [...demoEventIds],
  };
}

export class CompetitionFormatError extends Error {}

/** Default per-attempt time limit when selecting a category (10:00.00). */
export const DEFAULT_TIME_LIMIT_CS = 60_000;

/** 1-hour limit used for FMC, big BLD, and Multi-Blind (60:00.00). */
export const HOUR_TIME_LIMIT_CS = 360_000;

/** Events that default to a 1-hour time limit when selected. */
export const HOUR_DEFAULT_TIME_LIMIT_EVENT_IDS = [
  "333fm",
  "444bf",
  "555bf",
  "333mbf",
] as const;

/**
 * Events whose time limit is fixed by WCA practice (60 minutes) and must not
 * be edited in the categorías form.
 */
export const FIXED_TIME_LIMIT_EVENT_IDS = ["333fm", "333mbf"] as const;

const HOUR_DEFAULT_TIME_LIMIT_EVENT_ID_SET = new Set<string>(
  HOUR_DEFAULT_TIME_LIMIT_EVENT_IDS,
);
const FIXED_TIME_LIMIT_EVENT_ID_SET = new Set<string>(FIXED_TIME_LIMIT_EVENT_IDS);

/** Default time limit for a category when first selected. */
export function defaultTimeLimitCs(eventId: string): number {
  return HOUR_DEFAULT_TIME_LIMIT_EVENT_ID_SET.has(eventId)
    ? HOUR_TIME_LIMIT_CS
    : DEFAULT_TIME_LIMIT_CS;
}

/** Whether organizers may edit the time limit for this category. */
export function isTimeLimitEditable(eventId: string): boolean {
  return !FIXED_TIME_LIMIT_EVENT_ID_SET.has(eventId);
}

/**
 * Max total rounds for an event given this round’s competitor count (WCA 9m/9m1–9m3).
 * Counting from the current round inclusive.
 */
export function maxRoundsAllowed(competitors: number): number {
  const n = Math.max(0, Math.floor(competitors));
  if (n <= 7) return 1;
  if (n <= 15) return 2;
  if (n <= 99) return 3;
  return 4;
}

/** Max rounds that may follow the current round (WCA 9m1–9m3). */
export function maxSubsequentRounds(competitors: number): number {
  return Math.max(0, maxRoundsAllowed(competitors) - 1);
}

/** Max competitors that may advance (WCA 9p: at least 25% eliminated). */
export function maxAdvancingCompetitors(competitors: number): number {
  const n = Math.max(0, Math.floor(competitors));
  return Math.floor(n * 0.75);
}

/**
 * Typical competitors assigned to one group per station (solving + waiting).
 * Mexican AMS comps often pack ~1.6× stations into a group rather than 1:1.
 */
export const GROUP_COMPETITORS_PER_STATION = 1.6;

/**
 * How many groups a round needs. Packs denser than 1 competitor/station so
 * first rounds match real schedules (e.g. 78 @ 10 stations → 5 groups).
 */
export function estimateGroupCount(
  competitors: number,
  stationCount: number,
  options?: { medianCompetitorsPerGroup?: number | null },
): number {
  const stations = Math.max(1, Math.floor(stationCount));
  const n = Math.max(0, Math.floor(competitors));
  if (n === 0) return 0;

  const fromStations = stations * GROUP_COMPETITORS_PER_STATION;
  const empirical = options?.medianCompetitorsPerGroup;
  const perGroup = Math.max(
    stations,
    fromStations,
    empirical != null && empirical > 0 ? empirical : 0,
  );
  return Math.max(1, Math.ceil(n / perGroup));
}

export type EstimatedRound = {
  roundNumber: number;
  /**
   * Round 1 = expected; intermediate = 9p advance ceiling; final (when
   * stations are set) ≈ stations (usual AMS final field).
   */
  competitors: number;
  /** null when stations are unset or zero. */
  groups: number | null;
  maxSubsequent: number;
  /** True when planned rounds after this one exceed maxSubsequent (9m). */
  exceedsSubsequentLimit: boolean;
  /** Scheduled-duration estimate in minutes (from WCIF medians), when available. */
  estimatedMinutes: number | null;
};

/** Planning estimate for each planned round (groups + 9m + optional duration). */
export function estimateRoundPlan(input: {
  expectedCompetitors: number;
  rounds: number;
  stationCount: number | null;
  eventId?: string;
  /** Empirical pack size from horario medians; denser → fewer groups. */
  medianCompetitorsPerGroup?: number | null;
  estimateDurationMinutes?: (args: {
    eventId: string;
    competitors: number;
    groups: number | null;
  }) => number | null;
}): EstimatedRound[] {
  const rounds = Math.max(1, Math.min(4, Math.floor(input.rounds)));
  const stations =
    input.stationCount == null || input.stationCount < 1
      ? null
      : Math.floor(input.stationCount);

  const result: EstimatedRound[] = [];
  let competitors = Math.max(0, Math.floor(input.expectedCompetitors));

  for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
    const remainingAfter = rounds - roundNumber;
    const isFinal = rounds > 1 && roundNumber === rounds;
    if (isFinal && stations != null) {
      // Usual AMS final: about one competitor per station (Ao5 / podium field).
      competitors = Math.min(stations, competitors);
    }

    const maxSubsequent = maxSubsequentRounds(competitors);
    const groups =
      stations == null
        ? null
        : estimateGroupCount(competitors, stations, {
            medianCompetitorsPerGroup: input.medianCompetitorsPerGroup,
          });
    const estimatedMinutes =
      input.eventId && input.estimateDurationMinutes
        ? input.estimateDurationMinutes({
            eventId: input.eventId,
            competitors,
            groups,
          })
        : null;
    result.push({
      roundNumber,
      competitors,
      groups,
      maxSubsequent,
      exceedsSubsequentLimit: remainingAfter > maxSubsequent,
      estimatedMinutes,
    });

    const advanced = maxAdvancingCompetitors(competitors);
    const nextIsFinal = rounds > 1 && roundNumber + 1 === rounds;
    if (nextIsFinal && stations != null) {
      competitors = Math.min(stations, advanced);
    } else {
      competitors = advanced;
    }
  }

  return result;
}

export function normalizeEventsPlan(
  input: CompetitionEventPlanItem[],
  options?: { maxExpectedCompetitors?: number },
): CompetitionEventPlanItem[] {
  const seen = new Set<string>();
  const plan: CompetitionEventPlanItem[] = [];
  const maxExpected =
    options?.maxExpectedCompetitors == null
      ? 5000
      : Math.max(0, Math.floor(options.maxExpectedCompetitors));

  for (const raw of input) {
    const eventId = raw.eventId.trim();
    if (!isWcaEventId(eventId)) {
      throw new CompetitionFormatError(`Categoría no válida: ${raw.eventId}`);
    }
    if (seen.has(eventId)) {
      throw new CompetitionFormatError(
        `La categoría ${eventId} está duplicada`,
      );
    }
    seen.add(eventId);

    const expectedCompetitors = Math.floor(Number(raw.expectedCompetitors));
    if (
      !Number.isFinite(expectedCompetitors) ||
      expectedCompetitors < 0 ||
      expectedCompetitors > maxExpected
    ) {
      throw new CompetitionFormatError(
        maxExpected < 5000
          ? `Competidores esperados en ${eventId} no pueden superar el cupo (${maxExpected})`
          : `Competidores esperados inválidos para ${eventId}`,
      );
    }

    const rounds = Math.floor(Number(raw.rounds));
    if (!Number.isFinite(rounds) || rounds < 1 || rounds > 4) {
      throw new CompetitionFormatError(
        `Número de rondas inválido para ${eventId} (1–4)`,
      );
    }

    const allowedRounds = maxRoundsAllowed(expectedCompetitors);
    if (rounds > allowedRounds) {
      throw new CompetitionFormatError(
        `Con ${expectedCompetitors} esperados en ${eventId}, 9m permite máximo ${allowedRounds} ${allowedRounds === 1 ? "ronda" : "rondas"}`,
      );
    }

    const cutoffCs = normalizeOptionalCs(raw.cutoffCs, `corte de ${eventId}`);
    const timeLimitCs = isTimeLimitEditable(eventId)
      ? normalizeOptionalCs(raw.timeLimitCs, `límite de ${eventId}`)
      : defaultTimeLimitCs(eventId);

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

function normalizeOptionalCs(
  value: number | null | undefined,
  label: string,
): number | null {
  if (value == null) return null;
  const cs = Math.floor(Number(value));
  if (!Number.isFinite(cs) || cs < 0 || cs > 3_600_000) {
    throw new CompetitionFormatError(`Tiempo inválido (${label})`);
  }
  return cs;
}

export type CompetitionFormat = {
  stationCount: number | null;
  zoneCount: number;
  eventsPlan: CompetitionEventPlanItem[];
};

export function normalizeFormatInput(input: {
  stationCount: number | null;
  zoneCount: number;
  eventsPlan: CompetitionEventPlanItem[];
  maxExpectedCompetitors?: number;
}): CompetitionFormat {
  let stationCount: number | null = null;
  if (input.stationCount != null) {
    const stations = Math.floor(Number(input.stationCount));
    if (!Number.isFinite(stations) || stations < 1 || stations > 200) {
      throw new CompetitionFormatError(
        "El número de estaciones debe ser entre 1 y 200",
      );
    }
    stationCount = stations;
  }

  const zoneCount = Math.floor(Number(input.zoneCount));
  if (!Number.isFinite(zoneCount) || zoneCount < 1 || zoneCount > 20) {
    throw new CompetitionFormatError(
      "El número de zonas debe ser entre 1 y 20",
    );
  }

  return {
    stationCount,
    zoneCount,
    eventsPlan: normalizeEventsPlan(input.eventsPlan, {
      maxExpectedCompetitors: input.maxExpectedCompetitors,
    }),
  };
}
