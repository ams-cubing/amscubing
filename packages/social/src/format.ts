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

export function formatEventLabels(eventIds: string[]): string {
  if (eventIds.length === 0) return "";
  return eventIds.map((id) => EVENT_LABELS[id] ?? id).join(", ");
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
