import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { rankingEvents } from "@/lib/rankings";

const CUBING_MEXICO_API = "https://api.cubingmexico.net";
const STATS_REVALIDATE_SECONDS = 60 * 60 * 12;

const FALLBACK_STATS = {
  statesWithCompetitions: 18,
  officialEvents: rankingEvents.length,
} as const;

export type CommunityStats = {
  statesWithCompetitions: number;
  officialEvents: number;
};

type CompetitionsPage = {
  items?: Array<{
    cancelled?: boolean;
    stateId?: string | null;
  }>;
  total?: number;
};

export async function getCommunityStats(): Promise<CommunityStats> {
  "use cache";
  cacheLife("hours");
  cacheTag("community-stats");

  const [statesWithCompetitions, officialEvents] = await Promise.all([
    countStatesWithCompetitions(),
    countOfficialEvents(),
  ]);

  return {
    statesWithCompetitions:
      statesWithCompetitions ?? FALLBACK_STATS.statesWithCompetitions,
    officialEvents: officialEvents ?? FALLBACK_STATS.officialEvents,
  };
}

async function countStatesWithCompetitions(): Promise<number | null> {
  try {
    const stateIds = new Set<string>();
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    const maxPages = 20;

    while ((page - 1) * 100 < total && page <= maxPages) {
      const response = await fetch(
        `${CUBING_MEXICO_API}/competitions?page=${page}&size=100&cancelled=false`,
        {
          next: { revalidate: STATS_REVALIDATE_SECONDS },
          headers: { accept: "application/json" },
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as CompetitionsPage;
      const items = Array.isArray(data.items) ? data.items : [];

      if (typeof data.total === "number") {
        total = data.total;
      } else if (items.length === 0) {
        break;
      }

      for (const competition of items) {
        if (competition.stateId) {
          stateIds.add(competition.stateId);
        }
      }

      if (items.length === 0) {
        break;
      }

      page += 1;
    }

    return stateIds.size > 0 ? stateIds.size : null;
  } catch {
    return null;
  }
}

async function countOfficialEvents(): Promise<number | null> {
  try {
    const results = await Promise.all(
      rankingEvents.map(async (event) => {
        const response = await fetch(
          `${CUBING_MEXICO_API}/competitions?eventId=${event.id}&size=1&cancelled=false`,
          {
            next: { revalidate: STATS_REVALIDATE_SECONDS },
            headers: { accept: "application/json" },
          },
        );

        if (!response.ok) {
          return false;
        }

        const data = (await response.json()) as CompetitionsPage;
        return typeof data.total === "number" && data.total > 0;
      }),
    );

    const count = results.filter(Boolean).length;
    return count > 0 ? count : null;
  } catch {
    return null;
  }
}
