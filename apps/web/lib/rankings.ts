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

type CubingMexicoRow = {
  personId: string;
  countryRank: number;
  name: string;
  best: number;
  state: string | null;
};

type CubingMexicoPayload = {
  data: CubingMexicoRow[];
  pageCount: number;
};

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

const fallbackRanking: EventRanking[] = [
  {
    event: rankingEvents[0]!,
    single: [
      {
        countryRank: 1,
        personId: "2018SANC03",
        name: "Angel Armando Jaime Sánchez",
        result: "4.46",
        state: "Ciudad de México",
        profileUrl: "https://www.cubingmexico.net/persons/2018SANC03",
      },
      {
        countryRank: 2,
        personId: "2023ATLA01",
        name: "Saúl Méndez Atlatenco",
        result: "4.68",
        state: "Tlaxcala",
        profileUrl: "https://www.cubingmexico.net/persons/2023ATLA01",
      },
      {
        countryRank: 3,
        personId: "2017HERN11",
        name: "Joaquin Ruenes Hernández",
        result: "4.83",
        state: "Ciudad de México",
        profileUrl: "https://www.cubingmexico.net/persons/2017HERN11",
      },
    ],
    average: [],
  },
];

export async function getNationalRankings(): Promise<EventRanking[]> {
  const rankings = await Promise.all(
    rankingEvents.map(async (event) => ({
      event,
      single: await getRanking(event, "single"),
      average: event.supportsAverage ? await getRanking(event, "average") : [],
    })),
  );

  const populated = rankings.filter(
    (ranking) => ranking.single.length > 0 || ranking.average.length > 0,
  );

  return populated.length > 0 ? populated : fallbackRanking;
}

async function getRanking(
  event: RankingEvent,
  type: RankingType,
): Promise<RankingResult[]> {
  try {
    const response = await fetch(
      `https://www.cubingmexico.net/rankings/${event.id}/${type}`,
      {
        next: { revalidate: 60 * 60 * 12 },
        headers: {
          accept: "text/html",
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = extractRankingPayload(await response.text());

    if (!payload) {
      return [];
    }

    return payload.data.slice(0, 5).map((row) => ({
      countryRank: row.countryRank,
      personId: row.personId,
      name: row.name,
      result: formatRankingResult(row.best, event.id, type),
      state: row.state ?? "México",
      profileUrl: `https://www.cubingmexico.net/persons/${row.personId}`,
    }));
  } catch {
    return [];
  }
}

function extractRankingPayload(html: string): CubingMexicoPayload | null {
  const marker = '{"data":[{"personId"';
  const markerIndex = html.indexOf(marker);

  if (markerIndex !== -1) {
    return parseBalancedPayload(html, markerIndex);
  }

  const escapedMarker = '{\\"data\\":[{\\"personId\\"';
  const escapedMarkerIndex = html.indexOf(escapedMarker);

  if (escapedMarkerIndex === -1) {
    return null;
  }

  const escapedPayload = parseBalancedEscapedPayload(html, escapedMarkerIndex);

  if (!escapedPayload) {
    return null;
  }

  try {
    return JSON.parse(
      escapedPayload.replace(/\\"/g, '"'),
    ) as CubingMexicoPayload;
  } catch {
    return null;
  }
}

function parseBalancedPayload(
  source: string,
  startIndex: number,
): CubingMexicoPayload | null {
  const endIndex = findBalancedObjectEnd(source, startIndex, true);

  if (endIndex === -1) {
    return null;
  }

  try {
    return JSON.parse(
      source.slice(startIndex, endIndex + 1),
    ) as CubingMexicoPayload;
  } catch {
    return null;
  }
}

function parseBalancedEscapedPayload(
  source: string,
  startIndex: number,
): string | null {
  const endIndex = findBalancedObjectEnd(source, startIndex, false);

  return endIndex === -1 ? null : source.slice(startIndex, endIndex + 1);
}

function findBalancedObjectEnd(
  source: string,
  startIndex: number,
  respectStrings: boolean,
) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (respectStrings) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
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
