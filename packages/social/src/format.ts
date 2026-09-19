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

/** Full Spanish month names (uppercase) for Canva-style cover dates. */
const MONTHS_ES_COVER = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
] as const;

/** Cover state labels that differ from a plain uppercase name. */
const COVER_STATE_LABELS: Record<string, string> = {
  "baja california": "B. CALIFORNIA",
  "baja california sur": "B. C. SUR",
  "ciudad de mexico": "CDMX",
  "ciudad de méxico": "CDMX",
  "estado de mexico": "EDOMEX",
  "estado de méxico": "EDOMEX",
};

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

/**
 * City-only label for cover slots. Strips a trailing `, State` when present
 * so script text does not repeat the state line.
 */
export function formatCoverCityLine(
  cityName: string | null | undefined,
  stateName?: string | null,
): string {
  const city = (cityName ?? "").trim();
  if (!city) return "";

  const state = (stateName ?? "").trim();
  if (state) {
    const suffix = `, ${state}`;
    if (city.toLowerCase().endsWith(suffix.toLowerCase())) {
      return city.slice(0, city.length - suffix.length).trim();
    }
  }

  if (city.includes(",")) {
    return city.split(",")[0]!.trim();
  }

  return city;
}

/** Uppercase state label for the cover (e.g. Baja California → B. CALIFORNIA). */
export function formatCoverStateLabel(
  stateName: string | null | undefined,
): string {
  const state = (stateName ?? "").trim();
  if (!state) return "";

  const key = state.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const mapped =
    COVER_STATE_LABELS[state.toLowerCase()] ?? COVER_STATE_LABELS[key];
  if (mapped) return mapped;

  return state.toLocaleUpperCase("es-MX");
}

/**
 * Cover-style date range like Canva: `4-5 ABRIL`, `5 ABRIL`, or
 * `28 ABRIL - 1 MAYO` when the range crosses months.
 */
export function formatCoverDateRange(
  startDate: string,
  endDate?: string | null,
): string {
  const start = parseIsoParts(startDate);
  if (!start) return startDate;
  const startMonth = MONTHS_ES_COVER[start.month - 1]!;

  if (!endDate || endDate === startDate) {
    return `${start.day} ${startMonth}`;
  }

  const end = parseIsoParts(endDate);
  if (!end) {
    return `${start.day} ${startMonth} - ${endDate}`;
  }

  const endMonth = MONTHS_ES_COVER[end.month - 1]!;

  if (start.year === end.year && start.month === end.month) {
    return `${start.day}-${end.day} ${startMonth}`;
  }

  return `${start.day} ${startMonth} - ${end.day} ${endMonth}`;
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
