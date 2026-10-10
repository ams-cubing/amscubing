import type { PublicCompetition } from "@/lib/competitions";

export const MONTH_SHORT_NAMES = [
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
];

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** WCA returns ISO datetimes; DB dates are `YYYY-MM-DD`. */
function parseCalendarDate(dateString: string) {
  const cleanDate = dateString.split(/[T\s]/)[0] ?? dateString;
  const [year, month, day] = cleanDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function formatDate(dateString: string | null) {
  if (!dateString) return "-";
  const parsed = parseCalendarDate(dateString);
  if (!parsed) return "-";
  return `${String(parsed.day).padStart(2, "0")} ${MONTH_SHORT_NAMES[parsed.month - 1]}`;
}

export function formatCompetitionDate(startDate: string, endDate: string) {
  if (startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/** `YYYY-MM` key for filtering competitions by start month. */
export function getMonthKey(dateString: string) {
  const parsed = parseCalendarDate(dateString);
  if (!parsed) return null;
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
}

export function formatMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function isRegistrationOpen(label: string) {
  return label === "Inscripciones abiertas" || label === "Casi lleno";
}

export function statusVariant(
  label: string,
): "default" | "destructive" | "accent" | "brand" | "outline" {
  switch (label) {
    case "Inscripciones abiertas":
      return "default";
    case "Lleno":
      return "destructive";
    case "Casi lleno":
      return "accent";
    case "Cerrado":
      return "brand";
    case "Próximamente":
    default:
      return "outline";
  }
}

export function statusClassName(label: string) {
  switch (label) {
    case "Inscripciones abiertas":
      return "bg-ams-green text-white";
    case "Lleno":
      return "bg-ams-red text-white";
    case "Casi lleno":
      return "bg-ams-orange text-white";
    case "Cerrado":
      return "bg-ams-navy text-white";
    case "Próximamente":
    default:
      return "border border-black/10 bg-white text-ams-navy";
  }
}

export function filterCompetitions(
  competitions: PublicCompetition[],
  { state, month }: { state?: string; month?: string },
) {
  return competitions.filter(
    (competition) =>
      (!state || competition.state === state) &&
      (!month || getMonthKey(competition.startDate) === month),
  );
}

export function getFilterOptions(competitions: PublicCompetition[]) {
  const states = [
    ...new Set(competitions.map((c) => c.state).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "es"));
  const months = [
    ...new Set(
      competitions
        .map((c) => getMonthKey(c.startDate))
        .filter((key): key is string => Boolean(key)),
    ),
  ].sort();
  return { states, months };
}
