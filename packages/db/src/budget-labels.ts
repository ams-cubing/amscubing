import type {
  competitionBudgetLines,
  competitionBudgets,
  competitionSponsors,
} from "./schema/budget";

export type BudgetStatus = (typeof competitionBudgets.$inferSelect)["status"];
export type BudgetLineKind =
  (typeof competitionBudgetLines.$inferSelect)["kind"];
export type BudgetLineCategory =
  (typeof competitionBudgetLines.$inferSelect)["category"];
export type BudgetSpendStatus =
  (typeof competitionBudgetLines.$inferSelect)["spendStatus"];
export type BudgetReceiptStatus =
  (typeof competitionBudgetLines.$inferSelect)["receiptStatus"];
export type SponsorType = (typeof competitionSponsors.$inferSelect)["type"];

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  draft: "Borrador",
  plan_submitted: "Presupuesto enviado",
  plan_approved: "Presupuesto aprobado",
  mid_submitted: "Primer avance enviado",
  mid_approved: "Primer avance aprobado",
  final_submitted: "Informe final enviado",
  closed: "Cerrado",
};

export const BUDGET_LINE_KIND_LABELS: Record<BudgetLineKind, string> = {
  expense: "Gasto",
  income: "Ingreso",
};

export const BUDGET_LINE_CATEGORY_LABELS: Record<BudgetLineCategory, string> = {
  sede: "Sede",
  viaticos_transporte: "Viáticos — transporte",
  viaticos_hospedaje: "Viáticos — hospedaje",
  viaticos_alimentos: "Viáticos — alimentos",
  materiales: "Materiales",
  comida_staff: "Comida de staff",
  premios: "Premios",
  papeleria: "Papelería",
  cuota_wca: "Cuota WCA (máx. 5% / $10)",
  cuota_ams: "Cuota AMS (máx. 5% / $10)",
  comision_stripe: "Comisión Stripe (3.6% + $3)",
  inscripciones: "Inscripciones",
  patrocinio_efectivo: "Patrocinio en efectivo",
  otros: "Otros",
};

export const BUDGET_SPEND_STATUS_LABELS: Record<BudgetSpendStatus, string> = {
  none: "Sin solicitar",
  proposed: "Pendiente de aprobación",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export const BUDGET_RECEIPT_STATUS_LABELS: Record<
  BudgetReceiptStatus,
  string
> = {
  pending: "Pendiente",
  in_drive: "En Drive",
  missing_reason: "Sin comprobante",
};

export const SPONSOR_TYPE_LABELS: Record<SponsorType, string> = {
  cash: "Efectivo",
  in_kind: "En especie",
};

/** Seeded expense categories (system cuotas added separately). */
export const DEFAULT_EXPENSE_CATEGORIES: readonly BudgetLineCategory[] = [
  "sede",
  "viaticos_transporte",
  "viaticos_hospedaje",
  "viaticos_alimentos",
  "materiales",
  "comida_staff",
  "premios",
  "papeleria",
];

export const SYSTEM_FEE_CATEGORIES: readonly BudgetLineCategory[] = [
  "cuota_wca",
  "cuota_ams",
  "comision_stripe",
];

export const FEE_RATE_BPS = 500; // 5%
/** MXN floor per competitor for WCA (Band 2 ≈ $0.50 USD) and AMS. */
export const FEE_FLOOR_CENTS_PER_COMPETITOR = 1000; // $10 MXN
/** Stripe Mexico domestic card rate. */
export const STRIPE_RATE_BPS = 360; // 3.6%
export const STRIPE_FIXED_CENTS = 300; // $3 MXN

export const PLAN_EDITABLE_STATUSES: readonly BudgetStatus[] = [
  "draft",
  "plan_submitted",
];

/** Organizers can edit actuals/receipts in these statuses (not while a stage is pending review). */
export const ACTUALS_EDITABLE_STATUSES: readonly BudgetStatus[] = [
  "plan_approved",
  "mid_approved",
];

/** After plan approval we can sync paying counts from public WCIF. */
export const PAYING_COUNT_SYNC_STATUSES: readonly BudgetStatus[] = [
  "plan_approved",
  "mid_submitted",
  "mid_approved",
  "final_submitted",
  "closed",
];

export function formatMxnCents(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

/** Plain amount for money inputs (no `$`), e.g. `1,200.50`. */
export function formatMxnInput(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function parseMxnToCents(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, "");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/**
 * When quantity and unit are both set and positive, total = qty × unit.
 * Otherwise use the explicit total (simple mode).
 */
export function resolveLineTotalCents(opts: {
  quantity: number | null | undefined;
  unitCents: number | null | undefined;
  fallbackCents: number;
}): number {
  const qty = opts.quantity;
  const unit = opts.unitCents;
  if (
    qty != null &&
    unit != null &&
    Number.isInteger(qty) &&
    qty > 0 &&
    Number.isInteger(unit) &&
    unit >= 0
  ) {
    return qty * unit;
  }
  return opts.fallbackCents;
}
