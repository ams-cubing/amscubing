import type {
  EquipmentType,
  equipmentAcquisitions,
  equipmentEvents,
  equipmentItems,
  equipmentRequests,
} from "./schema";

export type EquipmentStatus = (typeof equipmentItems.$inferSelect)["status"];
export type EquipmentAcquisitionKind =
  (typeof equipmentAcquisitions.$inferSelect)["kind"];
export type EquipmentEventAction =
  (typeof equipmentEvents.$inferSelect)["action"];
export type EquipmentCategory = EquipmentType["category"];
export type EquipmentTracking = EquipmentType["tracking"];
export type LoanStatus = "active" | "partial" | "overdue" | "returned";
export type EquipmentRequestStatus =
  (typeof equipmentRequests.$inferSelect)["status"];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  functional: "Funcional",
  faulty: "Defectuoso",
  in_repair: "En reparación",
  lost: "Extraviado",
  retired: "Baja",
};

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  timer: "Timer",
  display: "Display",
  accessory: "Accesorio",
  other: "Otro",
};

export const EQUIPMENT_TRACKING_LABELS: Record<EquipmentTracking, string> = {
  serialized: "Por unidad (con SKU)",
  bulk: "Por cantidad",
};

export const EQUIPMENT_ACQUISITION_KIND_LABELS: Record<
  EquipmentAcquisitionKind,
  string
> = {
  purchase: "Compra",
  donation: "Donación",
  sponsorship: "Patrocinio",
  sale: "Venta",
  disposal: "Baja",
};

export const EQUIPMENT_EVENT_LABELS: Record<EquipmentEventAction, string> = {
  item_created: "Alta",
  item_updated: "Edición",
  status_changed: "Cambio de estado",
  transferred: "Transferencia",
  stock_adjusted: "Ajuste de cantidad",
  loaned: "Préstamo",
  returned: "Devolución",
  acquisition_recorded: "Adquisición/baja",
  retired: "Baja",
  request_updated: "Solicitud editada",
  request_submitted: "Solicitud enviada",
  request_cancelled: "Solicitud cancelada",
  request_confirmed: "Equipo confirmado",
};

export const EQUIPMENT_REQUEST_STATUS_LABELS: Record<
  EquipmentRequestStatus,
  string
> = {
  draft: "Borrador",
  submitted: "Enviada al delegado",
  fulfilled: "Equipo confirmado",
  cancelled: "Cancelada",
};

/** What organizers request from the board; delegates add the rest when confirming. */
export const ORGANIZER_REQUEST_CATEGORIES: readonly EquipmentCategory[] = [
  "timer",
  "display",
];

/** Organizers can still change the request in these states. */
export const EDITABLE_REQUEST_STATUSES: readonly EquipmentRequestStatus[] = [
  "draft",
  "submitted",
  "cancelled",
];

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  active: "Prestado",
  partial: "Devuelto parcial",
  overdue: "Vencido",
  returned: "Devuelto",
};

/** Unit confirmed for a competition that hasn't ended. */
export const RESERVED_LABEL = "Reservado";

/** Units in these states can be lent. */
export const LENDABLE_STATUSES: readonly EquipmentStatus[] = [
  "functional",
  "faulty",
];

/** Statuses accepted when a unit comes back from a loan. */
export const RETURN_STATUSES: readonly EquipmentStatus[] = [
  "functional",
  "faulty",
  "in_repair",
  "lost",
];

export const REMOVAL_KINDS: readonly EquipmentAcquisitionKind[] = [
  "sale",
  "disposal",
];

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
