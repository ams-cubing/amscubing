import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { WCA_EVENTS } from "@workspace/db/competition-format-rules";

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
// Without `size` the API returns every ranked Mexican competitor (~870 KB for 3x3x3).
const RANKING_SIZE = 5;

export const rankingEvents: RankingEvent[] = WCA_EVENTS.map((event) => ({
  id: event.id,
  name: event.name,
  supportsAverage: event.supportsAverage,
}));

export async function getNationalRankings(): Promise<EventRanking[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("national-rankings");

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
      `${CUBING_MEXICO_API}/rank/${type}/${event.id}?page=1&size=${RANKING_SIZE}`,
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
      .slice(0, RANKING_SIZE)
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
