"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NativeSelect } from "@workspace/ui/components/native-select";
import type {
  EquipmentConfirmationLineRow,
  EquipmentItemRow,
  EquipmentPerson,
  EquipmentStockRow,
} from "@workspace/db/equipment";
import type { EquipmentType } from "@workspace/db/schema";

import { confirmEquipmentRequestAction } from "../_actions/requests";
import { EquipmentStatusBadge } from "./badges";
import { SubmitButton } from "./submit-button";

const key = (guardianId: string, typeId: number) => `${guardianId}:${typeId}`;

function bulkAvailable(entry: EquipmentStockRow | undefined) {
  return entry
    ? Math.max(0, entry.quantity - entry.onLoan - entry.reserved)
    : 0;
}

type Selection = {
  picked: Set<number>;
  autoPick: Record<string, number>;
  bulk: Record<string, number>;
};

/** Existing lines when editing; otherwise the request spread over the competition's delegates. */
function initialSelection(
  existing: readonly EquipmentConfirmationLineRow[],
  requested: Record<number, number>,
  delegateIds: readonly string[],
  types: readonly EquipmentType[],
  items: readonly EquipmentItemRow[],
  stock: readonly EquipmentStockRow[],
): Selection {
  const selection: Selection = { picked: new Set(), autoPick: {}, bulk: {} };
  if (existing.length > 0) {
    for (const line of existing) {
      if (line.itemId != null) selection.picked.add(line.itemId);
      else selection.bulk[key(line.guardian.id, line.typeId)] = line.quantity;
    }
    return selection;
  }
  for (const type of types) {
    let wanted = requested[type.id] ?? 0;
    for (const guardianId of delegateIds) {
      if (wanted <= 0) break;
      const free =
        type.tracking === "serialized"
          ? items.filter(
              (item) =>
                item.typeId === type.id && item.guardian?.id === guardianId,
            ).length
          : bulkAvailable(
              stock.find(
                (s) => s.typeId === type.id && s.guardian.id === guardianId,
              ),
            );
      const take = Math.min(wanted, free);
      if (take <= 0) continue;
      const target =
        type.tracking === "serialized" ? selection.autoPick : selection.bulk;
      target[key(guardianId, type.id)] = take;
      wanted -= take;
    }
  }
  return selection;
}

export function ConfirmationForm({
  requestId,
  requested,
  existing,
  delegateIds,
  types,
  items,
  stock,
  guardians,
}: {
  requestId: number;
  /** Quantities the organizers asked for, by type id. */
  requested: Record<number, number>;
  existing: EquipmentConfirmationLineRow[];
  delegateIds: string[];
  types: EquipmentType[];
  items: EquipmentItemRow[];
  stock: EquipmentStockRow[];
  guardians: EquipmentPerson[];
}) {
  const holders = useMemo(() => {
    const ids = new Set([
      ...items.map((item) => item.guardian?.id),
      ...stock
        .filter((entry) => bulkAvailable(entry) > 0)
        .map((entry) => entry.guardian.id),
      ...existing.map((line) => line.guardian.id),
    ]);
    return guardians
      .filter((g) => ids.has(g.id))
      .sort(
        (a, b) =>
          Number(delegateIds.includes(b.id)) -
          Number(delegateIds.includes(a.id)),
      );
  }, [delegateIds, existing, guardians, items, stock]);

  const [initial] = useState(() =>
    initialSelection(existing, requested, delegateIds, types, items, stock),
  );
  const [guardianId, setGuardianId] = useState(holders[0]?.id ?? "");
  const [picked, setPicked] = useState(initial.picked);
  const [autoPick, setAutoPick] = useState(initial.autoPick);
  const [bulk, setBulk] = useState(initial.bulk);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const guardianItems = items.filter(
    (item) => item.guardian?.id === guardianId,
  );

  const serializedRows = types
    .filter((type) => type.tracking === "serialized")
    .map((type) => ({
      type,
      units: guardianItems.filter((item) => item.typeId === type.id),
    }))
    .filter((row) => row.units.length > 0);

  const bulkRows = types
    .filter((type) => type.tracking === "bulk")
    .map((type) => ({
      type,
      available: bulkAvailable(
        stock.find((s) => s.typeId === type.id && s.guardian.id === guardianId),
      ),
    }))
    .filter((row) => row.available > 0);

  const lines = useMemo(() => {
    const pickedGroups = new Set(
      items
        .filter((item) => picked.has(item.id) && item.guardian)
        .map((item) => key(item.guardian!.id, item.typeId)),
    );
    const parse = (entries: Record<string, number>) =>
      Object.entries(entries)
        .filter(([, quantity]) => quantity > 0)
        .map(([k, quantity]) => {
          const [guardianUserId, typeId] = k.split(":");
          return {
            guardianUserId: guardianUserId!,
            typeId: Number(typeId),
            quantity,
          };
        });
    return {
      itemIds: [...picked],
      autoPick: parse(autoPick).filter(
        (line) => !pickedGroups.has(key(line.guardianUserId, line.typeId)),
      ),
      bulk: parse(bulk),
    };
  }, [autoPick, bulk, items, picked]);

  const confirmedByType = new Map<number, number>();
  for (const id of lines.itemIds) {
    const item = items.find((i) => i.id === id);
    if (item) {
      confirmedByType.set(
        item.typeId,
        (confirmedByType.get(item.typeId) ?? 0) + 1,
      );
    }
  }
  for (const line of [...lines.autoPick, ...lines.bulk]) {
    confirmedByType.set(
      line.typeId,
      (confirmedByType.get(line.typeId) ?? 0) + line.quantity,
    );
  }
  const totalUnits = [...confirmedByType.values()].reduce((a, b) => a + b, 0);
  const comparedTypes = types.filter(
    (type) => requested[type.id] || confirmedByType.get(type.id),
  );

  const togglePicked = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ActionForm action={confirmEquipmentRequestAction} className="space-y-8">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      {comparedTypes.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Solicitado y confirmado</h2>
          <ul className="divide-y rounded-lg border text-sm">
            {comparedTypes.map((type) => {
              const want = requested[type.id] ?? 0;
              const have = confirmedByType.get(type.id) ?? 0;
              return (
                <li
                  key={type.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <span>{type.name}</span>
                  <span
                    className={
                      have < want ? "text-amber-700" : "text-muted-foreground"
                    }
                  >
                    {have} de {want}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Equipo que llevan</h2>
          <div className="space-y-2">
            <Label htmlFor="guardian">Guardián</Label>
            <NativeSelect
              id="guardian"
              value={guardianId}
              onChange={(e) => setGuardianId(e.target.value)}
            >
              {holders.length === 0 ? (
                <option value="">Nadie tiene equipo disponible</option>
              ) : null}
              {holders.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {delegateIds.includes(g.id) ? " · delegado" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          El equipo se queda con su guardián, pero queda reservado para esta
          competencia hasta que termine. Puedes combinar equipo de varios
          guardianes: cambia de guardián y lo ya elegido se conserva.
        </p>

        {serializedRows.length === 0 && bulkRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Este guardián no tiene equipo disponible.
          </p>
        ) : null}

        <div className="divide-y rounded-lg border">
          {serializedRows.map(({ type, units }) => {
            const pickedHere = units.filter((unit) => picked.has(unit.id));
            const isOpen = expanded.has(type.id);
            const k = key(guardianId, type.id);
            return (
              <div key={type.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{type.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {units.length} disponible(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pickedHere.length > 0 ? (
                      <span className="text-sm">
                        {pickedHere.length} elegida(s)
                      </span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={units.length}
                        className="w-24"
                        aria-label={`Cantidad de ${type.name}`}
                        value={autoPick[k] ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setAutoPick((prev) => ({
                            ...prev,
                            [k]: Math.min(
                              units.length,
                              Math.max(0, Number(e.target.value) || 0),
                            ),
                          }))
                        }
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(type.id)) next.delete(type.id);
                          else next.add(type.id);
                          return next;
                        })
                      }
                    >
                      {isOpen ? "Ocultar SKUs" : "Elegir SKUs"}
                    </Button>
                  </div>
                </div>
                {isOpen ? (
                  <div className="flex flex-wrap gap-2">
                    {units.map((unit) => (
                      <label
                        key={unit.id}
                        className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                      >
                        <Checkbox
                          checked={picked.has(unit.id)}
                          onCheckedChange={() => togglePicked(unit.id)}
                        />
                        <span className="font-mono">{unit.sku}</span>
                        {unit.status !== "functional" ? (
                          <EquipmentStatusBadge status={unit.status} />
                        ) : null}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {bulkRows.map(({ type, available }) => {
            const k = key(guardianId, type.id);
            return (
              <div
                key={type.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div>
                  <div className="font-medium">{type.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {available} disponible(s)
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={available}
                  className="w-24"
                  aria-label={`Cantidad de ${type.name}`}
                  value={bulk[k] ?? ""}
                  placeholder="0"
                  onChange={(e) =>
                    setBulk((prev) => ({
                      ...prev,
                      [k]: Math.min(
                        available,
                        Math.max(0, Number(e.target.value) || 0),
                      ),
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <span className="text-muted-foreground text-sm">
          {totalUnits} pieza(s) confirmadas
        </span>
        <SubmitButton disabled={totalUnits === 0}>
          {existing.length > 0 ? "Guardar confirmación" : "Confirmar equipo"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
