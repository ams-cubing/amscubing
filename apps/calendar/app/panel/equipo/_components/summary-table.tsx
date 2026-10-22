import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { InventorySummaryRow } from "@workspace/db/equipment";

function Count({ value, tone }: { value: number; tone?: string }) {
  if (value === 0) return <span className="text-muted-foreground">0</span>;
  return <span className={tone}>{value}</span>;
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
            <TableHead className="text-right">Prestados</TableHead>
            <TableHead className="text-right">Defectuosos</TableHead>
            <TableHead className="text-right">En reparación</TableHead>
            <TableHead className="text-right">Extraviados</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.type.id}>
              <TableCell>
                <div className="font-medium">{row.type.name}</div>
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
                <Count value={row.available} tone="text-emerald-700" />
              </TableCell>
              <TableCell className="text-right">
                <Count value={row.onLoan} tone="text-amber-700" />
              </TableCell>
              <TableCell className="text-right">
                <Count value={row.faulty} tone="text-amber-700" />
              </TableCell>
              <TableCell className="text-right">
                <Count value={row.inRepair} tone="text-sky-700" />
              </TableCell>
              <TableCell className="text-right">
                <Count value={row.lost} tone="text-red-700" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
