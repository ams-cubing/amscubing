export const PENDING_ANNOUNCEMENT_STATUSES = [
  "open",
  "reserved",
  "confirmed",
] as const;

const CLOSED_INTERNAL_STATUSES = new Set(["cancelled", "celebrated"]);

/**
 * A competition still blocks its organizers from requesting another date
 * while it is unannounced, not cancelled or finished, and has not ended.
 * `today` is a `YYYY-MM-DD` date in Mexico City.
 */
export function blocksNewDateRequest(
  competition: {
    statusPublic: string;
    statusInternal: string;
    endDate: string;
  },
  today: string,
) {
  return (
    (PENDING_ANNOUNCEMENT_STATUSES as readonly string[]).includes(
      competition.statusPublic,
    ) &&
    !CLOSED_INTERNAL_STATUSES.has(competition.statusInternal) &&
    competition.endDate >= today
  );
}
