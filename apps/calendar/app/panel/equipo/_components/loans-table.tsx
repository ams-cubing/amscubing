import type { Route } from "next";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { EquipmentLoanRow } from "@workspace/db/equipment";

import { formatEquipmentDate } from "@/lib/equipment-format";
import { LoanStatusBadge } from "./badges";

export function LoansTable({
  loans,
  empty,
}: {
  loans: EquipmentLoanRow[];
  empty: string;
}) {
  if (loans.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border p-6 text-sm">
        {empty}
      </p>
    );
  }

  return (
    <div className="bg-card overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Custodio</TableHead>
            <TableHead>Guardián prestador</TableHead>
            <TableHead>Préstamo</TableHead>
            <TableHead>Tentativa</TableHead>
            <TableHead>Devolución</TableHead>
            <TableHead>Equipo prestado</TableHead>
            <TableHead>Razón</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell>
                <Link
                  href={`/panel/equipo/prestamos/${loan.id}` as Route}
                  className="font-medium hover:underline"
                >
                  {loan.id}
                </Link>
              </TableCell>
              <TableCell>
                <div className="font-medium">{loan.borrower.name}</div>
                <div className="text-muted-foreground text-xs">
                  {loan.borrower.wcaId}
                </div>
              </TableCell>
              <TableCell>{loan.lentBy.name}</TableCell>
              <TableCell>{formatEquipmentDate(loan.loanedAt)}</TableCell>
              <TableCell>{formatEquipmentDate(loan.dueAt)}</TableCell>
              <TableCell>{formatEquipmentDate(loan.returnedAt)}</TableCell>
              <TableCell className="max-w-xs">{loan.summary}</TableCell>
              <TableCell className="text-muted-foreground max-w-xs">
                {loan.competition
                  ? `${loan.competition.name ?? loan.competition.city} · `
                  : ""}
                {loan.reason}
              </TableCell>
              <TableCell>
                <LoanStatusBadge status={loan.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
