"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NativeSelect } from "@workspace/ui/components/native-select";
import {
  EQUIPMENT_ACQUISITION_KIND_LABELS,
  REMOVAL_KINDS,
  type EquipmentAcquisitionKind,
} from "@workspace/db/equipment-labels";
import type {
  EquipmentItemRow,
  EquipmentPerson,
} from "@workspace/db/equipment";
import type { EquipmentType } from "@workspace/db/schema";

import { registerAcquisitionAction } from "../_actions/acquisitions";
import { SubmitButton } from "./submit-button";

type Line = {
  key: number;
  typeId: number | null;
  guardianUserId: string;
  quantity: number;
  itemIds: number[];
};

const SOURCE_SUGGESTIONS = ["AMS", "WCA", "Brick Cubes", "GearTeam"];

export function AcquisitionForm({
  types,
  guardians,
  items,
  today,
  defaultGuardianId,
}: {
  types: EquipmentType[];
  guardians: EquipmentPerson[];
  items: EquipmentItemRow[];
  today: string;
  defaultGuardianId: string | null;
}) {
  const [kind, setKind] = useState<EquipmentAcquisitionKind>("purchase");
  const [nextKey, setNextKey] = useState(1);
  const emptyLine = (key: number): Line => ({
    key,
    typeId: null,
    guardianUserId: defaultGuardianId ?? "",
    quantity: 1,
    itemIds: [],
  });
  const [lines, setLines] = useState<Line[]>([emptyLine(0)]);
  const removal = REMOVAL_KINDS.includes(kind);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  const typeById = new Map(types.map((type) => [type.id, type]));
  const payload = lines
    .filter((line) => line.typeId != null)
    .map((line) => {
      const type = typeById.get(line.typeId!)!;
      if (removal && type.tracking === "serialized") {
        return { typeId: type.id, itemIds: line.itemIds };
      }
      return {
        typeId: type.id,
        quantity: line.quantity,
        guardianUserId: line.guardianUserId,
      };
    });

  return (
    <ActionForm
      action={registerAcquisitionAction}
      onSuccess={() => {
        setLines([emptyLine(nextKey)]);
        setNextKey((k) => k + 1);
      }}
      className="space-y-6"
    >
      <input type="hidden" name="lines" value={JSON.stringify(payload)} />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="acq-kind">Tipo de movimiento</Label>
          <NativeSelect
            id="acq-kind"
            name="kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as EquipmentAcquisitionKind);
              setLines((prev) =>
                prev.map((line) => ({ ...line, itemIds: [] })),
              );
            }}
          >
            {(
              Object.keys(
                EQUIPMENT_ACQUISITION_KIND_LABELS,
              ) as EquipmentAcquisitionKind[]
            ).map((value) => (
              <option key={value} value={value}>
                {EQUIPMENT_ACQUISITION_KIND_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acq-date">Fecha</Label>
          <Input
            id="acq-date"
            name="date"
            type="date"
            defaultValue={today}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acq-source">Procedencia</Label>
          <Input
            id="acq-source"
            name="source"
            list="acq-sources"
            defaultValue="AMS"
            required
          />
          <datalist id="acq-sources">
            {SOURCE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acq-description">Descripción</Label>
          <Input
            id="acq-description"
            name="description"
            required
            placeholder="Se compraron 20 timers G5"
          />
        </div>
      </div>

      <div className="space-y-3">
        {lines.map((line) => {
          const type = line.typeId != null ? typeById.get(line.typeId) : null;
          const pickUnits = removal && type?.tracking === "serialized";
          const removableUnits = pickUnits
            ? items.filter(
                (item) => item.typeId === type!.id && item.onLoanId == null,
              )
            : [];
          return (
            <div key={line.key} className="space-y-2 rounded-lg border p-3">
              <div className="grid items-end gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
                <div className="space-y-1">
                  <Label className="text-xs">Equipo</Label>
                  <NativeSelect
                    value={line.typeId ?? ""}
                    onChange={(e) =>
                      update(line.key, {
                        typeId: e.target.value ? Number(e.target.value) : null,
                        itemIds: [],
                      })
                    }
                  >
                    <option value="">Selecciona…</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.skuPrefix})
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                {pickUnits ? (
                  <div className="text-muted-foreground text-sm md:col-span-2">
                    {line.itemIds.length} unidad(es) seleccionada(s)
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {removal ? "Se retira de" : "Guardián"}
                      </Label>
                      <NativeSelect
                        value={line.guardianUserId}
                        onChange={(e) =>
                          update(line.key, { guardianUserId: e.target.value })
                        }
                      >
                        <option value="">Selecciona…</option>
                        {guardians.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          update(line.key, {
                            quantity: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </div>
                  </>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Quitar renglón"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((prev) => prev.filter((l) => l.key !== line.key))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {pickUnits ? (
                <div className="flex flex-wrap gap-2">
                  {removableUnits.length === 0 ? (
                    <span className="text-muted-foreground text-sm">
                      No hay unidades disponibles de este tipo.
                    </span>
                  ) : null}
                  {removableUnits.map((unit) => (
                    <label
                      key={unit.id}
                      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                    >
                      <Checkbox
                        checked={line.itemIds.includes(unit.id)}
                        onCheckedChange={(checked) =>
                          update(line.key, {
                            itemIds: checked
                              ? [...line.itemIds, unit.id]
                              : line.itemIds.filter((id) => id !== unit.id),
                          })
                        }
                      />
                      <span className="font-mono">{unit.sku}</span>
                      <span className="text-muted-foreground">
                        {unit.guardian?.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              {!removal && type?.tracking === "serialized" ? (
                <p className="text-muted-foreground text-xs">
                  Se generarán {line.quantity} SKU(s) {type.skuPrefix}-AANN con
                  el año de la fecha del movimiento.
                </p>
              ) : null}
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLines((prev) => [...prev, emptyLine(nextKey)]);
            setNextKey((k) => k + 1);
          }}
        >
          <Plus className="size-4" /> Agregar renglón
        </Button>
      </div>

      <div className="flex justify-end">
        <SubmitButton disabled={payload.length === 0}>
          {removal ? "Registrar baja" : "Registrar adquisición"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
