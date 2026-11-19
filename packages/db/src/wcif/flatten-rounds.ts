import type {
  FlatRoundMetric,
  Wcif,
  WcifActivity,
  WcifRound,
} from "./types";
import type { CompetitionEventPlanItem } from "../schema/competitions";

const ROUND_CODE = /^([a-z0-9]+)-r(\d+)$/i;
const GROUP_CODE = /^([a-z0-9]+)-r(\d+)-g(\d+)$/i;

function walkActivities(
  activities: WcifActivity[] | undefined,
  out: WcifActivity[] = [],
): WcifActivity[] {
  for (const activity of activities ?? []) {
    out.push(activity);
    walkActivities(activity.childActivities, out);
  }
  return out;
}

function minutesBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return (end - start) / 60_000;
}

function parseRoundId(roundId: string): {
  eventId: string;
  roundNumber: number;
} | null {
  const match = ROUND_CODE.exec(roundId);
  if (!match) return null;
  return {
    eventId: match[1]!.toLowerCase(),
    roundNumber: Number(match[2]),
  };
}

function groupCountForRound(
  roundId: string,
  activities: WcifActivity[],
): number {
  const parent = activities.find((activity) => activity.activityCode === roundId);
  const fromChildren = (parent?.childActivities ?? []).filter((child) =>
    GROUP_CODE.test(child.activityCode),
  ).length;
  if (fromChildren > 0) return fromChildren;

  const loose = activities.filter((activity) =>
    activity.activityCode.startsWith(`${roundId}-g`),
  ).length;
  return Math.max(1, loose);
}

function scheduledMinutesForRound(
  roundId: string,
  activities: WcifActivity[],
): number {
  const parent = activities.find((activity) => activity.activityCode === roundId);
  if (parent) {
    const parentMinutes = minutesBetween(parent.startTime, parent.endTime);
    if (parentMinutes > 0) return parentMinutes;
  }

  const groups = activities.filter((activity) =>
    activity.activityCode.startsWith(`${roundId}-g`),
  );
  if (groups.length === 0) return 0;

  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;
  for (const group of groups) {
    const start = Date.parse(group.startTime);
    const end = Date.parse(group.endTime);
    if (Number.isFinite(start)) minStart = Math.min(minStart, start);
    if (Number.isFinite(end)) maxEnd = Math.max(maxEnd, end);
  }
  if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd) || maxEnd <= minStart) {
    return 0;
  }
  return (maxEnd - minStart) / 60_000;
}

function cutoffCs(round: WcifRound): number | null {
  const value = round.cutoff?.attemptResult;
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function timeLimitCs(round: WcifRound): number | null {
  const value = round.timeLimit?.centiseconds;
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

/** Flatten a public WCIF into one metrics row per round with results. */
export function flattenWcifRounds(wcif: Wcif): FlatRoundMetric[] {
  const competitionId = wcif.id;
  const activities = walkActivities(
    (wcif.schedule?.venues ?? []).flatMap((venue) =>
      (venue.rooms ?? []).flatMap((room) => room.activities ?? []),
    ),
  );

  const rows: FlatRoundMetric[] = [];
  for (const event of wcif.events ?? []) {
    for (const round of event.rounds ?? []) {
      const parsed = parseRoundId(round.id);
      if (!parsed) continue;
      const competitors = Array.isArray(round.results) ? round.results.length : 0;
      if (competitors <= 0) continue;

      const groups = groupCountForRound(round.id, activities);
      const scheduledMinutes = scheduledMinutesForRound(round.id, activities);
      const minutesPerGroup =
        groups > 0 ? scheduledMinutes / groups : scheduledMinutes;
      const competitorsPerGroup =
        groups > 0 ? competitors / groups : competitors;
      const minutesPerCompetitor =
        competitors > 0 ? scheduledMinutes / competitors : 0;
      const approxStations = Math.max(1, Math.ceil(competitors / groups));

      rows.push({
        competitionId,
        eventId: parsed.eventId,
        roundNumber: parsed.roundNumber,
        roundId: round.id,
        format: round.format ?? null,
        competitors,
        groups,
        scheduledMinutes,
        cutoffCs: cutoffCs(round),
        timeLimitCs: timeLimitCs(round),
        minutesPerGroup,
        competitorsPerGroup,
        minutesPerCompetitor,
        approxStations,
      });
    }
  }

  rows.sort((a, b) =>
    a.eventId === b.eventId
      ? a.roundNumber - b.roundNumber
      : a.eventId.localeCompare(b.eventId),
  );
  return rows;
}

/** Infer stations as max ceil(competitors/groups) over round 1s. */
export function inferStationCount(rows: FlatRoundMetric[]): number | null {
  const firstRounds = rows.filter((row) => row.roundNumber === 1);
  if (firstRounds.length === 0) return null;
  return Math.max(...firstRounds.map((row) => row.approxStations));
}

/**
 * Build a Categorías eventsPlan from WCIF metrics (R1 competitors / limits,
 * rounds = count of rounds with results).
 */
export function eventsPlanFromWcifMetrics(
  rows: FlatRoundMetric[],
): CompetitionEventPlanItem[] {
  const byEvent = new Map<string, FlatRoundMetric[]>();
  for (const row of rows) {
    const list = byEvent.get(row.eventId) ?? [];
    list.push(row);
    byEvent.set(row.eventId, list);
  }

  const plan: CompetitionEventPlanItem[] = [];
  for (const [eventId, eventRows] of byEvent) {
    const sorted = [...eventRows].sort((a, b) => a.roundNumber - b.roundNumber);
    const first = sorted[0];
    if (!first) continue;
    plan.push({
      eventId,
      expectedCompetitors: first.competitors,
      rounds: sorted.length,
      cutoffCs: first.cutoffCs,
      timeLimitCs: first.timeLimitCs,
    });
  }
  return plan;
}

export type HorarioEventEstimate = {
  eventId: string;
  sampleSize: number;
  medianMinutesPerGroup: number;
  medianMinutesPerCompetitor: number;
  medianCompetitorsPerGroup: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/** Skip multi-day / broken activity envelopes when aggregating. */
const MAX_ROUND_MINUTES_FOR_ESTIMATE = 240;

/** Aggregate flat rows into per-event planning coefficients. */
export function aggregateHorarioEstimates(
  rows: FlatRoundMetric[],
): HorarioEventEstimate[] {
  const byEvent = new Map<string, FlatRoundMetric[]>();
  for (const row of rows) {
    if (row.scheduledMinutes <= 0 || row.competitors <= 0) continue;
    if (row.scheduledMinutes > MAX_ROUND_MINUTES_FOR_ESTIMATE) continue;
    const list = byEvent.get(row.eventId) ?? [];
    list.push(row);
    byEvent.set(row.eventId, list);
  }

  const estimates: HorarioEventEstimate[] = [];
  for (const [eventId, eventRows] of byEvent) {
    estimates.push({
      eventId,
      sampleSize: eventRows.length,
      medianMinutesPerGroup: median(eventRows.map((row) => row.minutesPerGroup)),
      medianMinutesPerCompetitor: median(
        eventRows.map((row) => row.minutesPerCompetitor),
      ),
      medianCompetitorsPerGroup: median(
        eventRows.map((row) => row.competitorsPerGroup),
      ),
    });
  }
  return estimates.sort((a, b) => a.eventId.localeCompare(b.eventId));
}

export function formatRoundTable(rows: FlatRoundMetric[]): string {
  const header = [
    "round",
    "competitors",
    "groups",
    "minutes",
    "min/group",
    "comp/group",
    "stations≈",
  ].join("\t");
  const lines = rows.map((row) =>
    [
      row.roundId,
      row.competitors,
      row.groups,
      row.scheduledMinutes.toFixed(1),
      row.minutesPerGroup.toFixed(1),
      row.competitorsPerGroup.toFixed(1),
      row.approxStations,
    ].join("\t"),
  );
  return [header, ...lines].join("\n");
}
