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

// Asks for one competition per state and reads `total`: listing every competition
// downloads ~800 KB, mostly the markdown `information` field.
async function countStatesWithCompetitions(): Promise<number | null> {
  try {
    const statesResponse = await fetch(`${CUBING_MEXICO_API}/states`, {
      next: { revalidate: STATS_REVALIDATE_SECONDS },
      headers: { accept: "application/json" },
    });

    if (!statesResponse.ok) {
      return null;
    }

    const states = (await statesResponse.json()) as Array<{ id?: string }>;

    if (!Array.isArray(states) || states.length === 0) {
      return null;
    }

    const results = await Promise.all(
      states.map(async (state) => {
        if (!state.id) {
          return false;
        }

        const response = await fetch(
          `${CUBING_MEXICO_API}/competitions?stateId=${encodeURIComponent(state.id)}&size=1&cancelled=false`,
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
