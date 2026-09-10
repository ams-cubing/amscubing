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

type WcaCompetition = {
  name?: string;
  short_name?: string;
  registration_open?: string | null;
  registration_close?: string | null;
  competitor_limit?: number | null;
  url?: string;
};

const competitionImages = [
  "/source/photos/ponny-3.jpg",
  "/source/photos/chalco-3.jpg",
  "/source/photos/guelaguetza-2.jpg",
] as const;

const PUBLIC_COMPETITIONS_LIMIT = 12;

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
        and(
          eq(t.statusPublic, "announced"),
          gte(t.endDate, todayMexicoIsoDate()),
        ),
      orderBy: (t, { asc }) => [asc(t.startDate)],
      limit: PUBLIC_COMPETITIONS_LIMIT,
    });

    if (rows.length === 0) {
      return [];
    }

    return Promise.all(
      rows.map(async (row, index) => {
        const wcaId = extractWcaCompetitionId(row.wcaCompetitionUrl, row.id);
        const wca = wcaId ? await getWcaCompetition(wcaId) : null;

        const registrationOpen = wca?.registration_open ?? null;
        const registrationClose = wca?.registration_close ?? null;
        const capacity =
          typeof wca?.competitor_limit === "number" && wca.competitor_limit > 0
            ? wca.competitor_limit
            : row.capacity;
        const wcaCompetitionUrl =
          row.wcaCompetitionUrl ??
          (wcaId
            ? `https://www.worldcubeassociation.org/competitions/${wcaId}`
            : null);

        return {
          id: wcaId ?? row.id,
          name:
            wca?.short_name ??
            wca?.name ??
            row.name ??
            `Competencia en ${row.city}`,
          city: row.city,
          state: row.state.name,
          startDate: row.startDate,
          endDate: row.endDate,
          capacity,
          registered: null,
          registrationOpen,
          registrationClose,
          wcaCompetitionUrl,
          image:
            competitionImages[index % competitionImages.length] ??
            competitionImages[0],
          label: deriveRegistrationLabel(registrationOpen, registrationClose),
        };
      }),
    );
  } catch {
    return [];
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

function extractWcaCompetitionId(
  wcaCompetitionUrl: string | null,
  id: number | string,
): string | null {
  if (wcaCompetitionUrl) {
    const match = wcaCompetitionUrl.match(/competitions\/([^/?#]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  if (typeof id === "string" && id.length > 0) {
    return id;
  }

  return null;
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

function deriveRegistrationLabel(
  registrationOpen: string | null,
  registrationClose: string | null,
): string {
  if (!registrationOpen || !registrationClose) {
    return "Próximamente";
  }

  const now = Date.now();
  const openAt = Date.parse(registrationOpen);
  const closeAt = Date.parse(registrationClose);

  if (Number.isNaN(openAt) || Number.isNaN(closeAt)) {
    return "Próximamente";
  }

  if (now < openAt) {
    return "Próximamente";
  }

  if (now > closeAt) {
    return "Cerrado";
  }

  return "Inscripciones abiertas";
}
