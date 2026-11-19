import type { CompetitionEventPlanItem } from "./schema/competitions";

export type WcaEvent = {
  id: string;
  name: string;
  shortName: string;
};

/** Official WCA events used when planning categorías. */
export const WCA_EVENTS: readonly WcaEvent[] = [
  { id: "333", name: "3x3x3 Cube", shortName: "3x3" },
  { id: "222", name: "2x2x2 Cube", shortName: "2x2" },
  { id: "444", name: "4x4x4 Cube", shortName: "4x4" },
  { id: "555", name: "5x5x5 Cube", shortName: "5x5" },
  { id: "666", name: "6x6x6 Cube", shortName: "6x6" },
  { id: "777", name: "7x7x7 Cube", shortName: "7x7" },
  { id: "333bf", name: "3x3x3 Blindfolded", shortName: "3BLD" },
  { id: "333fm", name: "3x3x3 Fewest Moves", shortName: "3FM" },
  { id: "333oh", name: "3x3x3 One-Handed", shortName: "3OH" },
  { id: "clock", name: "Clock", shortName: "Clock" },
  { id: "minx", name: "Megaminx", shortName: "Megaminx" },
  { id: "pyram", name: "Pyraminx", shortName: "Pyraminx" },
  { id: "skewb", name: "Skewb", shortName: "Skewb" },
  { id: "sq1", name: "Square-1", shortName: "Square-1" },
  { id: "444bf", name: "4x4x4 Blindfolded", shortName: "4BLD" },
  { id: "555bf", name: "5x5x5 Blindfolded", shortName: "5BLD" },
  { id: "333mbf", name: "3x3x3 Multi-Blind", shortName: "Multi-BLD" },
] as const;

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

export function normalizeEventsPlan(
  input: CompetitionEventPlanItem[],
): CompetitionEventPlanItem[] {
  const seen = new Set<string>();
  const plan: CompetitionEventPlanItem[] = [];

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
      expectedCompetitors > 5000
    ) {
      throw new CompetitionFormatError(
        `Competidores esperados inválidos para ${eventId}`,
      );
    }

    const rounds = Math.floor(Number(raw.rounds));
    if (!Number.isFinite(rounds) || rounds < 1 || rounds > 4) {
      throw new CompetitionFormatError(
        `Número de rondas inválido para ${eventId} (1–4)`,
      );
    }

    const cutoffCs = normalizeOptionalCs(raw.cutoffCs, `corte de ${eventId}`);
    const timeLimitCs = normalizeOptionalCs(
      raw.timeLimitCs,
      `límite de ${eventId}`,
    );

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
    eventsPlan: normalizeEventsPlan(input.eventsPlan),
  };
}
