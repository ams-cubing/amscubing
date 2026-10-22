"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { Textarea } from "@workspace/ui/components/textarea";
import type {
  EquipmentItemRow,
  EquipmentPerson,
  EquipmentStockRow,
} from "@workspace/db/equipment";
import type { EquipmentType } from "@workspace/db/schema";

import {
  OrganizerCombobox,
  organizerSubtitle,
  type OrganizerOption,
} from "../../competencias/_components/organizer-combobox";
import { createLoanAction } from "../_actions/loans";
import { EquipmentStatusBadge } from "./badges";
import { SubmitButton } from "./submit-button";

type CompetitionOption = {
  id: number;
  name: string | null;
  city: string;
  startDate: string;
};

export function LoanForm({
  types,
  items,
  stock,
  guardians,
  competitions,
  defaultLenderId,
  today,
}: {
  types: EquipmentType[];
  items: EquipmentItemRow[];
  stock: EquipmentStockRow[];
  guardians: EquipmentPerson[];
  competitions: CompetitionOption[];
  defaultLenderId: string | null;
  today: string;
}) {
  const lenders = useMemo(() => {
    const ids = new Set([
      ...items.map((item) => item.guardian?.id),
      ...stock.map((entry) => entry.guardian.id),
    ]);
    return guardians.filter((g) => ids.has(g.id));
  }, [guardians, items, stock]);

  const [borrower, setBorrower] = useState<OrganizerOption | null>(null);
  const [lenderId, setLenderId] = useState(
    lenders.some((l) => l.id === defaultLenderId)
      ? defaultLenderId!
      : (lenders[0]?.id ?? ""),
  );
  const [autoPick, setAutoPick] = useState<Record<number, number>>({});
  const [bulk, setBulk] = useState<Record<number, number>>({});
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const lenderItems = items.filter((item) => item.guardian?.id === lenderId);
  const lenderStock = stock.filter((entry) => entry.guardian.id === lenderId);

  const changeLender = (id: string) => {
    setLenderId(id);
    setAutoPick({});
    setBulk({});
    setPicked(new Set());
  };

  const serializedRows = types
    .filter((type) => type.tracking === "serialized")
    .map((type) => ({
      type,
      units: lenderItems.filter((item) => item.typeId === type.id),
    }))
    .filter((row) => row.units.length > 0);

  const bulkRows = types
    .filter((type) => type.tracking === "bulk")
    .map((type) => {
      const entry = lenderStock.find((s) => s.typeId === type.id);
      return {
        type,
        available: entry ? Math.max(0, entry.quantity - entry.onLoan) : 0,
      };
    })
    .filter((row) => row.available > 0);

  const lines = {
    itemIds: [...picked],
    autoPick: serializedRows
      .filter(({ units }) => !units.some((unit) => picked.has(unit.id)))
      .map(({ type }) => ({
        typeId: type.id,
        quantity: autoPick[type.id] ?? 0,
      }))
      .filter((line) => line.quantity > 0),
    bulk: bulkRows
      .map(({ type }) => ({ typeId: type.id, quantity: bulk[type.id] ?? 0 }))
      .filter((line) => line.quantity > 0),
  };
  const totalUnits =
    lines.itemIds.length +
    lines.autoPick.reduce((sum, line) => sum + line.quantity, 0) +
    lines.bulk.reduce((sum, line) => sum + line.quantity, 0);

  const togglePicked = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ActionForm action={createLoanAction} className="space-y-8">
      <input type="hidden" name="borrowerUserId" value={borrower?.id ?? ""} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>¿Quién recibe el equipo?</Label>
          {borrower ? (
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{borrower.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {organizerSubtitle(borrower)}
                </span>
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Quitar"
                onClick={() => setBorrower(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <OrganizerCombobox
              value=""
              selectedOrganizers={[]}
              onSelect={setBorrower}
              placeholder="Buscar por nombre, WCA ID o correo"
            />
          )}
          <p className="text-muted-foreground text-xs">
            Debe tener cuenta. Si no aparece, agrégalo con su WCA ID.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lentByUserId">Guardián que presta</Label>
          <NativeSelect
            id="lentByUserId"
            name="lentByUserId"
            value={lenderId}
            onChange={(e) => changeLender(e.target.value)}
            required
          >
            {lenders.length === 0 ? (
              <option value="">Nadie tiene equipo disponible</option>
            ) : null}
            {lenders.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="competitionId">Competencia (opcional)</Label>
          <NativeSelect id="competitionId" name="competitionId" defaultValue="">
            <option value="">
              Sin competencia (torneo no oficial, evento…)
            </option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.city} · {c.startDate}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Razón del préstamo</Label>
          <Input
            id="reason"
            name="reason"
            required
            placeholder="Para los torneos no oficiales del SubUrbano"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="loanedAt">Fecha de préstamo</Label>
            <Input
              id="loanedAt"
              name="loanedAt"
              type="date"
              defaultValue={today}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueAt">Fecha tentativa de devolución</Label>
            <Input id="dueAt" name="dueAt" type="date" min={today} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea id="notes" name="notes" rows={2} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Equipo</h2>
        {serializedRows.length === 0 && bulkRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Este guardián no tiene equipo disponible para prestar.
          </p>
        ) : null}

        <div className="divide-y rounded-lg border">
          {serializedRows.map(({ type, units }) => {
            const pickedHere = units.filter((unit) => picked.has(unit.id));
            const isOpen = expanded.has(type.id);
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
                        value={autoPick[type.id] ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setAutoPick((prev) => ({
                            ...prev,
                            [type.id]: Math.min(
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

          {bulkRows.map(({ type, available }) => (
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
                value={bulk[type.id] ?? ""}
                placeholder="0"
                onChange={(e) =>
                  setBulk((prev) => ({
                    ...prev,
                    [type.id]: Math.min(
                      available,
                      Math.max(0, Number(e.target.value) || 0),
                    ),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <span className="text-muted-foreground text-sm">
          {totalUnits} pieza(s) en el préstamo
        </span>
        <SubmitButton disabled={!borrower || totalUnits === 0}>
          Registrar préstamo
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
