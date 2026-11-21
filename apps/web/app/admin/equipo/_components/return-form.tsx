"use client";

import { useState } from "react";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Input } from "@workspace/ui/components/input";
import { NativeSelect } from "@workspace/ui/components/native-select";
import {
  EQUIPMENT_STATUS_LABELS,
  RETURN_STATUSES,
} from "@workspace/db/equipment-labels";
import type { EquipmentLoanLineRow } from "@workspace/db/equipment";

import { returnLoanAction } from "../_actions/loans";
import { SubmitButton } from "./submit-button";

const NOT_RETURNED = "";

export function ReturnForm({
  loanId,
  lines,
}: {
  loanId: number;
  lines: EquipmentLoanLineRow[];
}) {
  const openUnits = lines.filter(
    (line) => line.itemId != null && line.returnedQuantity < line.quantity,
  );
  const openBulk = lines.filter(
    (line) => line.itemId == null && line.returnedQuantity < line.quantity,
  );

  const [unitStatus, setUnitStatus] = useState<Record<number, string>>(() =>
    Object.fromEntries(openUnits.map((line) => [line.id, "functional"])),
  );
  const [bulkReturn, setBulkReturn] = useState<
    Record<number, { returned: number; lost: number }>
  >(() =>
    Object.fromEntries(
      openBulk.map((line) => [
        line.id,
        { returned: line.quantity - line.returnedQuantity, lost: 0 },
      ]),
    ),
  );

  const returns = {
    items: openUnits
      .filter((line) => unitStatus[line.id])
      .map((line) => ({ lineId: line.id, status: unitStatus[line.id] })),
    bulk: openBulk.map((line) => ({
      lineId: line.id,
      returned: bulkReturn[line.id]?.returned ?? 0,
      lost: bulkReturn[line.id]?.lost ?? 0,
    })),
  };

  if (openUnits.length === 0 && openBulk.length === 0) return null;

  return (
    <ActionForm action={returnLoanAction} className="space-y-4">
      <input type="hidden" name="loanId" value={loanId} />
      <input type="hidden" name="returns" value={JSON.stringify(returns)} />

      {openUnits.length > 0 ? (
        <div className="divide-y rounded-md border">
          {openUnits.map((line) => (
            <div
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-mono">{line.sku}</span>{" "}
                <span className="text-muted-foreground">{line.typeName}</span>
              </span>
              <NativeSelect
                className="w-48"
                aria-label={`Estado de ${line.sku}`}
                value={unitStatus[line.id] ?? NOT_RETURNED}
                onChange={(e) =>
                  setUnitStatus((prev) => ({
                    ...prev,
                    [line.id]: e.target.value,
                  }))
                }
              >
                <option value={NOT_RETURNED}>Aún no se devuelve</option>
                {RETURN_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "lost"
                      ? "No regresó (extraviado)"
                      : `Devuelto · ${EQUIPMENT_STATUS_LABELS[status]}`}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ))}
        </div>
      ) : null}

      {openBulk.length > 0 ? (
        <div className="divide-y rounded-md border">
          {openBulk.map((line) => {
            const pending = line.quantity - line.returnedQuantity;
            const value = bulkReturn[line.id] ?? { returned: 0, lost: 0 };
            const set = (field: "returned" | "lost", raw: string) =>
              setBulkReturn((prev) => ({
                ...prev,
                [line.id]: {
                  ...value,
                  [field]: Math.max(0, Math.min(pending, Number(raw) || 0)),
                },
              }));
            return (
              <div
                key={line.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>
                  {line.typeName}{" "}
                  <span className="text-muted-foreground">
                    ({pending} pendiente(s))
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    Devueltos
                    <Input
                      type="number"
                      min={0}
                      max={pending}
                      className="w-20"
                      value={value.returned}
                      onChange={(e) => set("returned", e.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    Extraviados
                    <Input
                      type="number"
                      min={0}
                      max={pending}
                      className="w-20"
                      value={value.lost}
                      onChange={(e) => set("lost", e.target.value)}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton>Registrar devolución</SubmitButton>
      </div>
    </ActionForm>
  );
}
