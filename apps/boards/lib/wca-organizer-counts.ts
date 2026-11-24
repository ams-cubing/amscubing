import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { log } from "@workspace/server/log";

const WCA_COMPETITIONS_API =
  "https://www.worldcubeassociation.org/api/v0/competitions";
const MAX_PAGES = 8;
const PER_PAGE = 100;

type WcaListOrganizer = {
  wca_id?: string | null;
};

type WcaListCompetition = {
  id: string;
  start_date: string;
  end_date: string;
  cancelled_at?: string | null;
  organizers?: WcaListOrganizer[] | null;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mexicoCityToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Rolling two-year window ending today (Mexico City). */
export function organizerExperienceWindow(): {
  start: string;
  end: string;
} {
  const end = mexicoCityToday();
  const endDate = new Date(`${end}T12:00:00.000Z`);
  const startDate = new Date(endDate);
  startDate.setUTCFullYear(startDate.getUTCFullYear() - 2);
  return { start: isoDate(startDate), end };
}

export type MexicoOrganizerCountsResult = {
  ok: boolean;
  counts: Record<string, number>;
};

/**
 * Counts ended, non-cancelled MX WCA competitions each person organized in the
 * last two years. Cached for hours (shared across boards).
 */
export async function getMexicoOrganizerCountsLastTwoYears(): Promise<MexicoOrganizerCountsResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("wca-mx-organizer-counts");

  const { start, end } = organizerExperienceWindow();
  const counts: Record<string, number> = {};
  let ok = false;

  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = new URL(WCA_COMPETITIONS_API);
      url.searchParams.set("country_iso2", "MX");
      url.searchParams.set("start", start);
      url.searchParams.set("end", end);
      url.searchParams.set("per_page", String(PER_PAGE));
      url.searchParams.set("page", String(page));

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        log.warn("wca.organizer_counts.fetch_failed", {
          status: response.status,
          page,
        });
        return { ok: false, counts: {} };
      }

      const batch = (await response.json()) as WcaListCompetition[];
      ok = true;
      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const competition of batch) {
        if (competition.cancelled_at) continue;
        if (!competition.end_date || competition.end_date > end) continue;
        if (competition.start_date < start) continue;

        for (const organizer of competition.organizers ?? []) {
          const wcaId = organizer.wca_id?.trim().toUpperCase();
          if (!wcaId) continue;
          counts[wcaId] = (counts[wcaId] ?? 0) + 1;
        }
      }

      if (batch.length < PER_PAGE) break;
    }
  } catch (error) {
    log.error("wca.organizer_counts.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, counts: {} };
  }

  return { ok, counts };
}
