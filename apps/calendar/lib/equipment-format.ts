import type {
  EquipmentStatus,
  LoanStatus,
} from "@workspace/db/equipment-labels";

/** Formats a `YYYY-MM-DD` date or timestamp in Spanish without timezone drift. */
export function formatEquipmentDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date =
    typeof value === "string"
      ? new Date(`${value.slice(0, 10)}T12:00:00`)
      : value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatEquipmentDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(value);
}

export const STATUS_BADGE_CLASSES: Record<EquipmentStatus, string> = {
  functional: "bg-emerald-100 text-emerald-800 border-emerald-200",
  faulty: "bg-amber-100 text-amber-900 border-amber-200",
  in_repair: "bg-sky-100 text-sky-900 border-sky-200",
  lost: "bg-red-100 text-red-800 border-red-200",
  retired: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export const LOAN_BADGE_CLASSES: Record<LoanStatus, string> = {
  active: "bg-amber-100 text-amber-900 border-amber-200",
  partial: "bg-sky-100 text-sky-900 border-sky-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  returned: "bg-emerald-100 text-emerald-800 border-emerald-200",
};
