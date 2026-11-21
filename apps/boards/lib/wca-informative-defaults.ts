import { fetchWcaCompetition } from "@workspace/social";
import { log } from "@workspace/server/log";

import { wcaCompetitionIdFromUrl } from "@/lib/wca-authenticated-wcif";

const WCA_API = "https://www.worldcubeassociation.org/api/v0/competitions";
const TZ = "America/Mexico_City";

export type WcifScheduleActivity = {
  name?: string | null;
  activityCode?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  childActivities?: WcifScheduleActivity[] | null;
};

export type PublicWcifSchedule = {
  schedule?: {
    venues?: Array<{
      rooms?: Array<{
        name?: string | null;
        activities?: WcifScheduleActivity[] | null;
      }> | null;
    }> | null;
  } | null;
};

export type InformativeEmailWcaDefaults = {
  address: string;
  checkIn: string;
  tutorialTime: string;
  scheduleOverview: string;
};

function topLevelActivities(wcif: PublicWcifSchedule | null | undefined) {
  const out: WcifScheduleActivity[] = [];
  for (const venue of wcif?.schedule?.venues ?? []) {
    for (const room of venue.rooms ?? []) {
      for (const activity of room.activities ?? []) {
        out.push(activity);
      }
    }
  }
  out.sort(
    (a, b) =>
      Date.parse(a.startTime ?? "") - Date.parse(b.startTime ?? ""),
  );
  return out;
}

function findByCode(
  activities: WcifScheduleActivity[],
  codes: string[],
): WcifScheduleActivity | null {
  for (const code of codes) {
    const match = activities.find(
      (activity) => activity.activityCode?.trim() === code,
    );
    if (match) return match;
  }
  return null;
}

/** e.g. "sábado – 8:00" or "sábado 16 de mayo – 8:00–9:00". */
export function formatActivityLabel(
  activity: WcifScheduleActivity | null | undefined,
): string {
  const startIso = activity?.startTime?.trim();
  if (!startIso) return "";
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";

  const weekday = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    weekday: "long",
  }).format(start);
  const dayMonth = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
  }).format(start);
  const time = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(start);

  const endIso = activity?.endTime?.trim();
  let endTime = "";
  if (endIso) {
    const end = new Date(endIso);
    if (!Number.isNaN(end.getTime())) {
      endTime = new Intl.DateTimeFormat("es-MX", {
        timeZone: TZ,
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      }).format(end);
    }
  }

  const clock = endTime && endTime !== time ? `${time}–${endTime}` : time;
  return `${weekday} ${dayMonth} – ${clock}`;
}

export function formatVenueAddress(input: {
  venueName?: string | null;
  venueAddress?: string | null;
  venueDetails?: string | null;
}): string {
  const name = input.venueName?.trim() || "";
  const address = input.venueAddress?.trim() || "";
  const details = input.venueDetails?.trim() || "";
  if (name && address) {
    if (address.toLowerCase().includes(name.toLowerCase())) return address;
    return `${name} — ${address}`;
  }
  return name || address || details;
}

export function scheduleOverviewFromWcif(
  wcif: PublicWcifSchedule | null | undefined,
): string {
  const activities = topLevelActivities(wcif);
  if (activities.length === 0) return "";

  const lines: string[] = [];
  for (const activity of activities) {
    const when = formatActivityLabel(activity);
    const name =
      activity.name?.trim() || activity.activityCode?.trim() || "Actividad";
    if (!when) continue;
    lines.push(`- ${when} — ${name}`);
  }
  return lines.join("\n");
}

export function checkInAndTutorialFromWcif(
  wcif: PublicWcifSchedule | null | undefined,
): { checkIn: string; tutorialTime: string } {
  const activities = topLevelActivities(wcif);
  const checkIn = formatActivityLabel(
    findByCode(activities, ["other-checkin", "other-registration"]),
  );
  const tutorialTime = formatActivityLabel(
    findByCode(activities, ["other-tutorial"]),
  );
  return { checkIn, tutorialTime };
}

export async function fetchPublicWcifSchedule(
  wcaCompetitionId: string,
): Promise<PublicWcifSchedule | null> {
  try {
    const response = await fetch(
      `${WCA_API}/${encodeURIComponent(wcaCompetitionId)}/wcif/public`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      log.warn("wca.public_wcif_schedule_failed", {
        competitionId: wcaCompetitionId,
        status: response.status,
      });
      return null;
    }
    return (await response.json()) as PublicWcifSchedule;
  } catch (error) {
    log.error("wca.public_wcif_schedule_network", {
      competitionId: wcaCompetitionId,
      error,
    });
    return null;
  }
}

/** Venue + schedule defaults from public WCA/WCIF (no manage_competitions). */
export async function loadInformativeEmailWcaDefaults(
  wcaCompetitionUrl: string | null | undefined,
): Promise<InformativeEmailWcaDefaults> {
  const empty: InformativeEmailWcaDefaults = {
    address: "",
    checkIn: "",
    tutorialTime: "",
    scheduleOverview: "",
  };
  if (!wcaCompetitionUrl?.trim()) return empty;

  const wcaId = wcaCompetitionIdFromUrl(wcaCompetitionUrl);
  const [wca, wcif] = await Promise.all([
    fetchWcaCompetition(wcaCompetitionUrl),
    wcaId ? fetchPublicWcifSchedule(wcaId) : Promise.resolve(null),
  ]);

  const { checkIn, tutorialTime } = checkInAndTutorialFromWcif(wcif);
  return {
    address: wca.ok
      ? formatVenueAddress({
          venueName: wca.competition.venueName,
          venueAddress: wca.competition.venueAddress,
          venueDetails: wca.competition.venueDetails,
        })
      : "",
    checkIn,
    tutorialTime,
    scheduleOverview: scheduleOverviewFromWcif(wcif),
  };
}
