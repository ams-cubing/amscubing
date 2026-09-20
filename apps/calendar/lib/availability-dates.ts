import { availability } from "@workspace/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

/** Calendar day `YYYY-MM-DD` from a local Date (never UTC via toISOString). */
export function toDateOnlyString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive local calendar-day range as `YYYY-MM-DD` strings. */
export function dateRangeStrings(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(toDateOnlyString(d));
  }
  return dates;
}

type AvailabilityExecutor = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (...args: any[]) => any;
};

/** Hold (delete) a delegate's availability for an inclusive date range. */
export async function holdAvailability(
  tx: AvailabilityExecutor,
  wcaId: string,
  startDate: string,
  endDate: string,
) {
  await tx
    .delete(availability)
    .where(
      and(
        eq(availability.userWcaId, wcaId),
        gte(availability.date, startDate),
        lte(availability.date, endDate),
      ),
    );
}

/** Restore a delegate's availability for an inclusive date range. */
export async function restoreAvailability(
  tx: AvailabilityExecutor,
  wcaId: string,
  startDate: string,
  endDate: string,
) {
  const dates = dateRangeStrings(startDate, endDate);
  if (dates.length === 0) return;

  await tx
    .insert(availability)
    .values(dates.map((date) => ({ userWcaId: wcaId, date })))
    .onConflictDoNothing();
}
