import type { Route } from "next";
import Link from "next/link";
import {
  EQUIPMENT_EVENT_LABELS,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from "@workspace/db/equipment-labels";
import type { EquipmentEventRow } from "@workspace/db/equipment";

import { formatEquipmentDateTime } from "@/lib/equipment-format";

type Change = { before: unknown; after: unknown };

function isChange(value: unknown): value is Change {
  return typeof value === "object" && value !== null && "after" in value;
}

function label(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && value in EQUIPMENT_STATUS_LABELS) {
    return EQUIPMENT_STATUS_LABELS[value as EquipmentStatus];
  }
  return String(value);
}

const FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  notes: "Notas",
};

function describe(event: EquipmentEventRow) {
  const details = (event.details ?? {}) as Record<string, unknown>;
  const parts: string[] = [];

  if (event.typeName && !event.sku) {
    const qty = event.quantityDelta;
    parts.push(
      qty != null
        ? `${qty > 0 ? "+" : ""}${qty} ${event.typeName}`
        : event.typeName,
    );
  }
  if (event.fromName || event.toName) {
    parts.push(`${event.fromName ?? "—"} → ${event.toName ?? "—"}`);
  } else if (event.guardianName && event.action === "stock_adjusted") {
    parts.push(`Guardián: ${event.guardianName}`);
  }
  for (const [field, value] of Object.entries(details)) {
    if (isChange(value)) {
      parts.push(
        `${FIELD_LABELS[field] ?? field}: ${label(value.before)} → ${label(value.after)}`,
      );
    }
  }
  if (typeof details.reason === "string") parts.push(details.reason);
  if (typeof details.note === "string") parts.push(details.note);
  if (typeof details.description === "string") parts.push(details.description);
  if (typeof details.lost === "number")
    parts.push(`${details.lost} extraviado(s)`);
  if (Array.isArray(details.createdSkus) && details.createdSkus.length) {
    parts.push(`SKUs: ${details.createdSkus.join(", ")}`);
  }
  return parts.join(" · ");
}

export function EventTimeline({
  events,
  showSku = false,
}: {
  events: EquipmentEventRow[];
  showSku?: boolean;
}) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin movimientos.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 pl-4 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">
              {EQUIPMENT_EVENT_LABELS[event.action]}
            </span>
            {showSku && event.sku ? (
              <Link
                href={`/panel/equipo/${encodeURIComponent(event.sku)}` as Route}
                className="font-mono text-xs hover:underline"
              >
                {event.sku}
              </Link>
            ) : null}
            {event.loanId ? (
              <Link
                href={`/panel/equipo/prestamos/${event.loanId}` as Route}
                className="text-xs text-amber-700 hover:underline"
              >
                Préstamo #{event.loanId}
              </Link>
            ) : null}
            <span className="text-muted-foreground text-xs">
              {formatEquipmentDateTime(event.createdAt)} · {event.actor.name}
            </span>
          </div>
          {describe(event) ? (
            <p className="text-muted-foreground mt-0.5">{describe(event)}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
