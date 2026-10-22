import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type {
  EquipmentItemRow,
  EquipmentPerson,
  GuardianInventory,
} from "@workspace/db/equipment";

import { EquipmentStatusBadge } from "./badges";
import { Person } from "./person";
import { StockActions } from "./stock-actions";

function groupItemsByType(items: EquipmentItemRow[]) {
  const groups = new Map<string, EquipmentItemRow[]>();
  for (const item of items) {
    const list = groups.get(item.typeName) ?? [];
    list.push(item);
    groups.set(item.typeName, list);
  }
  return [...groups];
}

export function GuardianCards({
  groups,
  guardians,
  currentUserId,
}: {
  groups: GuardianInventory[];
  guardians: EquipmentPerson[];
  currentUserId: string | null;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border p-6 text-sm">
        Ningún delegado tiene equipo asignado todavía.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map(({ guardian, items, stock }) => (
        <Card
          key={guardian.id}
          className={cn(
            guardian.id === currentUserId && "ring-primary/40 ring-1",
          )}
        >
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Person person={guardian} size={40} />
              {guardian.id === currentUserId ? (
                <Badge variant="secondary">Tu equipo</Badge>
              ) : null}
            </CardTitle>
            {items.length > 0 ? (
              <CardAction>
                <Link
                  href={
                    `/panel/equipo?guardian=${encodeURIComponent(guardian.id)}` as Route
                  }
                  prefetch={false}
                  className="text-muted-foreground hover:text-foreground text-sm hover:underline"
                >
                  Ver unidades
                </Link>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {items.length > 0 ? (
              <div className="space-y-3">
                {groupItemsByType(items).map(([typeName, units]) => (
                  <div key={typeName}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="font-medium">{typeName}</span>
                      <span className="text-muted-foreground text-xs">
                        {units.length} unidad(es)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {units.map((unit) => (
                        <Link
                          key={unit.id}
                          href={
                            `/panel/equipo/${encodeURIComponent(unit.sku)}` as Route
                          }
                          className="hover:bg-accent inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-xs"
                          title={unit.notes ?? undefined}
                        >
                          {unit.sku}
                          {unit.status !== "functional" ? (
                            <EquipmentStatusBadge status={unit.status} />
                          ) : null}
                          {unit.onLoanId != null ? (
                            <span className="text-amber-700">· prestado</span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {stock.length > 0 ? (
              <div className="divide-y rounded-md border">
                {stock.map((entry) => (
                  <div
                    key={entry.typeId}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{entry.typeName}</div>
                      <div className="text-muted-foreground text-xs">
                        {entry.quantity} en total
                        {entry.onLoan > 0 ? ` · ${entry.onLoan} prestados` : ""}
                        {entry.notes ? ` · ${entry.notes}` : ""}
                      </div>
                    </div>
                    <StockActions
                      typeId={entry.typeId}
                      typeName={entry.typeName}
                      guardian={guardian}
                      quantity={entry.quantity}
                      onLoan={entry.onLoan}
                      notes={entry.notes}
                      guardians={guardians}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
