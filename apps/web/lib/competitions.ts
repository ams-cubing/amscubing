import "server-only";

import { db } from "@workspace/db";

export type PublicCompetition = {
  id: number | string;
  name: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  capacity: number;
  registered: number | null;
  registrationOpen: string | null;
  registrationClose: string | null;
  wcaCompetitionUrl: string | null;
  image: string;
  label: string;
};

export type CompetitionSpotlight = {
  id: PublicCompetition["id"];
  name: string;
  city: string;
  state: string;
  startDate: string;
  status: "En curso" | "Próximo";
  url: string;
};

type WpCompetition = {
  id: string;
  city: string;
  start_date: string;
  end_date: string;
  registration_open: string | null;
  registration_close: string | null;
  competitor_limit: number;
  total_registrados?: number | null;
  status:
    | "abierto"
    | "lleno"
    | "casi_lleno"
    | "cerrado"
    | "no_abierto"
    | string;
  image: string;
  url: string;
};

type WcaCompetition = {
  name?: string;
  short_name?: string;
};

export const fallbackCompetitions: PublicCompetition[] = [
  {
    id: "fallback-ponny",
    name: "Ponny Open 2026",
    city: "Ciudad de México",
    state: "CDMX",
    startDate: "2026-03-28",
    endDate: "2026-03-28",
    capacity: 120,
    registered: null,
    registrationOpen: null,
    registrationClose: null,
    wcaCompetitionUrl: null,
    image: "/source/photos/ponny-3.jpg",
    label: "Inscripciones abiertas",
  },
  {
    id: "fallback-mexchamp",
    name: "Campeonato Mexicano 2026",
    city: "Ciudad de México",
    state: "CDMX",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    capacity: 300,
    registered: null,
    registrationOpen: null,
    registrationClose: null,
    wcaCompetitionUrl: null,
    image: "/source/photos/chalco-3.jpg",
    label: "Evento principal",
  },
  {
    id: "fallback-guelaguetza",
    name: "Guelaguetza Cubing Open",
    city: "Oaxaca de Juárez",
    state: "Oaxaca",
    startDate: "2026-09-12",
    endDate: "2026-09-13",
    capacity: 100,
    registered: null,
    registrationOpen: null,
    registrationClose: null,
    wcaCompetitionUrl: null,
    image: "/source/photos/guelaguetza-2.jpg",
    label: "Próximamente",
  },
];

const competitionImages = [
  "/source/photos/ponny-3.jpg",
  "/source/photos/chalco-3.jpg",
  "/source/photos/guelaguetza-2.jpg",
] as const;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function todayMexicoIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getCompetitionSpotlights(
  competitions: PublicCompetition[],
): CompetitionSpotlight[] {
  const today = todayMexicoIsoDate();
  const sortedCompetitions = [...competitions].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const ongoingCompetitions = sortedCompetitions.filter(
    (competition) =>
      competition.startDate <= today && competition.endDate >= today,
  );

  if (ongoingCompetitions.length > 0) {
    return ongoingCompetitions.map((competition) =>
      formatCompetitionSpotlight(competition, "En curso"),
    );
  }

  const nextCompetition = sortedCompetitions.find(
    (competition) => competition.startDate > today,
  );

  if (!nextCompetition) {
    return [];
  }

  return sortedCompetitions
    .filter(
      (competition) => competition.startDate === nextCompetition.startDate,
    )
    .map((competition) => formatCompetitionSpotlight(competition, "Próximo"));
}

export async function getPublicCompetitions(): Promise<PublicCompetition[]> {
  const wpCompetitions = await getWordPressPluginCompetitions();

  if (wpCompetitions.length > 0) {
    return wpCompetitions;
  }

  try {
    const rows = await db.query.competitions.findMany({
      columns: {
        id: true,
        name: true,
        city: true,
        startDate: true,
        endDate: true,
        capacity: true,
        wcaCompetitionUrl: true,
      },
      with: {
        state: {
          columns: {
            name: true,
          },
        },
      },
      where: (t, { and, eq, gte }) =>
        and(eq(t.statusPublic, "announced"), gte(t.endDate, todayIsoDate())),
      orderBy: (t, { asc }) => [asc(t.startDate)],
      limit: 6,
    });

    if (rows.length === 0) {
      return fallbackCompetitions;
    }

    return rows.map((row, index) => ({
      id: row.id,
      name: row.name ?? `Competencia en ${row.city}`,
      city: row.city,
      state: row.state.name,
      startDate: row.startDate,
      endDate: row.endDate,
      capacity: row.capacity,
      registered: null,
      registrationOpen: null,
      registrationClose: null,
      wcaCompetitionUrl: row.wcaCompetitionUrl,
      image:
        competitionImages[index % competitionImages.length] ??
        competitionImages[0],
      label: index === 0 ? "Próximo torneo" : "Anunciada",
    }));
  } catch {
    return fallbackCompetitions;
  }
}

function formatCompetitionSpotlight(
  competition: PublicCompetition,
  status: CompetitionSpotlight["status"],
): CompetitionSpotlight {
  return {
    id: competition.id,
    name: competition.name,
    city: competition.city,
    state: competition.state,
    startDate: competition.startDate,
    status,
    url:
      status === "En curso"
        ? `https://live.worldcubeassociation.org/competitions/${getWcaCompetitionId(
            competition,
          )}`
        : (competition.wcaCompetitionUrl ??
          `https://www.worldcubeassociation.org/competitions/${getWcaCompetitionId(
            competition,
          )}`),
  };
}

function getWcaCompetitionId(competition: PublicCompetition) {
  if (typeof competition.id === "string" && competition.id.length > 0) {
    return competition.id;
  }

  if (competition.wcaCompetitionUrl) {
    const match = competition.wcaCompetitionUrl.match(
      /competitions\/([^/?#]+)/,
    );
    if (match?.[1]) {
      return match[1];
    }
  }

  return String(competition.id);
}

async function getWordPressPluginCompetitions(): Promise<PublicCompetition[]> {
  try {
    const response = await fetch(
      "https://amscubing.org/utils/upcoming/events_v2.php",
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const events = (await response.json()) as WpCompetition[];

    const hydratedEvents = await Promise.all(
      events.map(async (event) => ({
        event,
        wca: await getWcaCompetition(event.id),
      })),
    );

    return hydratedEvents.map(({ event, wca }) => {
      const [city, state = ""] = event.city
        .split(",")
        .map((part) => part.trim());

      return {
        id: event.id,
        name: wca?.short_name ?? wca?.name ?? formatCompetitionId(event.id),
        city: city || event.city,
        state,
        startDate: event.start_date,
        endDate: event.end_date,
        capacity: event.competitor_limit,
        registered: event.total_registrados ?? null,
        registrationOpen: event.registration_open,
        registrationClose: event.registration_close,
        wcaCompetitionUrl: event.url,
        image: normalizeWordPressCompetitionImage(event.image),
        label: formatWordPressStatus(event.status),
      };
    });
  } catch {
    return [];
  }
}

async function getWcaCompetition(id: string): Promise<WcaCompetition | null> {
  try {
    const response = await fetch(
      `https://www.worldcubeassociation.org/api/v0/competitions/${id}`,
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as WcaCompetition;
  } catch {
    return null;
  }
}

function formatCompetitionId(id: string) {
  return id
    .replace(/(\d{4})$/, " $1")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2");
}

function normalizeWordPressCompetitionImage(image: string) {
  if (image.startsWith("http")) {
    return image;
  }

  const normalized = image.replace(/^\.\.\//, "");
  return `https://amscubing.org/utils/${normalized}`;
}

function formatWordPressStatus(status: WpCompetition["status"]) {
  switch (status) {
    case "abierto":
      return "Inscripciones abiertas";
    case "lleno":
      return "Lleno";
    case "casi_lleno":
      return "Casi lleno";
    case "cerrado":
      return "Cerrado";
    case "no_abierto":
      return "Próximamente";
    default:
      return "Próximamente";
  }
}
