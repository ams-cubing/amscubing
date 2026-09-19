/** Friendly Spanish labels for WCA event ids. */
const EVENT_LABELS: Record<string, string> = {
  "333": "3x3",
  "222": "2x2",
  "444": "4x4",
  "555": "5x5",
  "666": "6x6",
  "777": "7x7",
  "333bf": "3BLD",
  "333fm": "3FM",
  "333oh": "3OH",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
  "444bf": "4BLD",
  "555bf": "5BLD",
  "333mbf": "Multi-BLD",
};

const MONTHS_ES_SHORT = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
] as const;

export function formatEventLabels(eventIds: string[]): string {
  if (eventIds.length === 0) return "";
  return eventIds.map((id) => EVENT_LABELS[id] ?? id).join(", ");
}

/**
 * Build a city/state line without duplicating state when city already includes it.
 * Mirrors cubingmexico `format_place_line`.
 */
export function formatPlaceLine(
  cityName: string | null | undefined,
  stateName?: string | null,
  options?: { separator?: string },
): string {
  const city = (cityName ?? "").trim();
  const state = (stateName ?? "").trim();
  const separator = options?.separator ?? " · ";

  if (!city && !state) return "";
  if (!state) return city;
  if (!city) return state;

  if (city.toLowerCase().endsWith(`, ${state.toLowerCase()}`)) {
    return city;
  }
  if (city.includes(",")) {
    const afterComma = city.split(",").pop()?.trim() ?? "";
    if (afterComma.toLowerCase() === state.toLowerCase()) {
      return city;
    }
  }

  return `${city}${separator}${state}`;
}

/** Cover-style date range: `16 MAY - 17 MAY` or `16 MAY` when same day. */
export function formatCoverDateRange(
  startDate: string,
  endDate?: string | null,
): string {
  const start = parseIsoParts(startDate);
  if (!start) return startDate;
  const startLabel = `${pad2(start.day)} ${MONTHS_ES_SHORT[start.month - 1]}`;

  if (!endDate || endDate === startDate) {
    return startLabel;
  }

  const end = parseIsoParts(endDate);
  if (!end) {
    return `${startLabel} - ${endDate}`;
  }

  const endLabel = `${pad2(end.day)} ${MONTHS_ES_SHORT[end.month - 1]}`;
  return `${startLabel} - ${endLabel}`;
}

/** Cover registration window from ISO datetimes or dates. */
export function formatCoverRegistrationRange(
  openIso: string | null | undefined,
  closeIso: string | null | undefined,
): string | null {
  const openDate = isoToDatePart(openIso);
  const closeDate = isoToDatePart(closeIso);
  if (!openDate && !closeDate) return null;
  if (openDate && closeDate) {
    return formatCoverDateRange(openDate, closeDate);
  }
  return formatCoverDateRange(openDate ?? closeDate!);
}

export function formatDateRangeEs(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatDateEs(startDate);
  }
  const start = parseIsoParts(startDate);
  const end = parseIsoParts(endDate);
  if (!start || !end) {
    return `${startDate} – ${endDate}`;
  }

  if (start.year === end.year && start.month === end.month) {
    return `${start.day} y ${end.day} de ${monthName(start.month)} de ${start.year}`;
  }

  return `${formatDateEs(startDate)} – ${formatDateEs(endDate)}`;
}

function isoToDatePart(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseIsoParts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function monthName(month: number): string {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, month - 1, 1)));
}

function formatDateEs(isoDate: string): string {
  const parts = parseIsoParts(isoDate);
  if (!parts) return isoDate;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
