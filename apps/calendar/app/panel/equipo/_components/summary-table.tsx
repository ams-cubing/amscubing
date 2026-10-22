import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { InventorySummaryRow } from "@workspace/db/equipment";

import {
  LOAN_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
} from "@/lib/equipment-format";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Unavailable({ row }: { row: InventorySummaryRow }) {
  const parts = [
    {
      count: row.onLoan,
      label: plural(row.onLoan, "prestado"),
      className: LOAN_BADGE_CLASSES.active,
    },
    {
      count: row.reserved,
      label: plural(row.reserved, "reservado"),
      className: "border-sky-200 bg-sky-100 text-sky-900",
    },
    {
      count: row.faulty,
      label: plural(row.faulty, "defectuoso"),
      className: STATUS_BADGE_CLASSES.faulty,
    },
    {
      count: row.inRepair,
      label: `${row.inRepair} en reparación`,
      className: STATUS_BADGE_CLASSES.in_repair,
    },
    {
      count: row.lost,
      label: plural(row.lost, "extraviado"),
      className: STATUS_BADGE_CLASSES.lost,
    },
  ].filter((part) => part.count > 0);

  if (parts.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((part) => (
        <Badge key={part.label} variant="outline" className={part.className}>
          {part.label}
        </Badge>
      ))}
    </div>
  );
}

export function SummaryTable({ rows }: { rows: InventorySummaryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border p-6 text-sm">
        Aún no hay tipos de equipo. Créalos en Adquisiciones → Catálogo.
      </p>
    );
  }

  return (
    <div className="bg-card overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipo</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Disponibles</TableHead>
            <TableHead>Fuera de stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.type.id}>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {row.type.name}
                  {row.type.obsoleteAt ? (
                    <Badge variant="outline">Obsoleto</Badge>
                  ) : null}
                </div>
                <div className="text-muted-foreground text-xs">
                  {row.type.skuPrefix} ·{" "}
                  {row.type.tracking === "serialized"
                    ? "por unidad"
                    : "por cantidad"}
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {row.total}
              </TableCell>
              <TableCell className="text-right">
                {row.available === 0 ? (
                  <span className="text-muted-foreground">0</span>
                ) : (
                  <span className="text-emerald-700">{row.available}</span>
                )}
              </TableCell>
              <TableCell>
                <Unavailable row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
