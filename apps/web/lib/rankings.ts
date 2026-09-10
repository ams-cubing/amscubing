import "server-only";

export type RankingType = "single" | "average";

export type RankingEvent = {
  id: string;
  name: string;
  supportsAverage: boolean;
};

export type RankingResult = {
  countryRank: number;
  personId: string;
  name: string;
  result: string;
  state: string;
  profileUrl: string;
};

export type EventRanking = {
  event: RankingEvent;
  single: RankingResult[];
  average: RankingResult[];
};

type CubingMexicoRankRow = {
  best: number;
  eventId: string;
  personId: string;
  personName: string;
  rank: {
    world: number;
    continent: number;
    country: number;
    state: number;
  };
  rankType: RankingType;
  stateId: string | null;
};

type CubingMexicoState = {
  id: string;
  name: string;
};

const CUBING_MEXICO_API = "https://api.cubingmexico.net";
const RANKINGS_REVALIDATE_SECONDS = 60 * 60 * 12;

export const rankingEvents: RankingEvent[] = [
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
  { id: "444bf", name: "4x4x4 Blindfolded", supportsAverage: true },
  { id: "555bf", name: "5x5x5 Blindfolded", supportsAverage: true },
  { id: "333mbf", name: "3x3x3 Multi-Blind", supportsAverage: false },
];

export async function getNationalRankings(): Promise<EventRanking[]> {
  const stateNames = await getStateNameMap();

  const rankings = await Promise.all(
    rankingEvents.map(async (event) => ({
      event,
      single: await getRanking(event, "single", stateNames),
      average: event.supportsAverage
        ? await getRanking(event, "average", stateNames)
        : [],
    })),
  );

  return rankings.filter(
    (ranking) => ranking.single.length > 0 || ranking.average.length > 0,
  );
}

async function getRanking(
  event: RankingEvent,
  type: RankingType,
  stateNames: Map<string, string>,
): Promise<RankingResult[]> {
  try {
    const response = await fetch(
      `${CUBING_MEXICO_API}/rank/${type}/${event.id}`,
      {
        next: { revalidate: RANKINGS_REVALIDATE_SECONDS },
        headers: {
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const rows = (await response.json()) as CubingMexicoRankRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    return rows
      .slice()
      .sort((a, b) => a.rank.country - b.rank.country)
      .slice(0, 5)
      .map((row) => ({
        countryRank: row.rank.country,
        personId: row.personId,
        name: row.personName,
        result: formatRankingResult(row.best, event.id, type),
        state: (row.stateId && stateNames.get(row.stateId)) || "México",
        profileUrl: `https://www.cubingmexico.net/persons/${row.personId}`,
      }));
  } catch {
    return [];
  }
}

async function getStateNameMap(): Promise<Map<string, string>> {
  try {
    const response = await fetch(`${CUBING_MEXICO_API}/states`, {
      next: { revalidate: RANKINGS_REVALIDATE_SECONDS },
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return new Map();
    }

    const states = (await response.json()) as CubingMexicoState[];

    if (!Array.isArray(states)) {
      return new Map();
    }

    return new Map(states.map((state) => [state.id, state.name]));
  } catch {
    return new Map();
  }
}

function formatRankingResult(
  value: number,
  eventId: string,
  type: RankingType,
) {
  if (eventId === "333fm") {
    return type === "average" ? trimDecimals(value / 100, 2) : `${value}`;
  }

  if (eventId === "333mbf") {
    return `${value}`;
  }

  return formatCentiseconds(value);
}

function formatCentiseconds(value: number) {
  const minutes = Math.floor(value / 6000);
  const seconds = Math.floor((value % 6000) / 100);
  const centiseconds = value % 100;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(
      centiseconds,
    ).padStart(2, "0")}`;
  }

  return `${seconds}.${String(centiseconds).padStart(2, "0")}`;
}

function trimDecimals(value: number, digits: number) {
  return value.toFixed(digits).replace(/\.?0+$/, "");
}
