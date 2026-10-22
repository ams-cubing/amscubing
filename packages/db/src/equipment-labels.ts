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
};

export const EQUIPMENT_REQUEST_STATUS_LABELS: Record<
  EquipmentRequestStatus,
  string
> = {
  draft: "Borrador",
  submitted: "Enviada al delegado",
  fulfilled: "Préstamo registrado",
  cancelled: "Cancelada",
};

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
