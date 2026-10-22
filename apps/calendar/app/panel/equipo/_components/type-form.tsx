"use client";

import { ActionForm } from "@workspace/ui/components/action-form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NativeSelect } from "@workspace/ui/components/native-select";
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_TRACKING_LABELS,
  type EquipmentCategory,
  type EquipmentTracking,
} from "@workspace/db/equipment-labels";

import { createTypeAction } from "../_actions/inventory";
import { SubmitButton } from "./submit-button";

export function TypeForm() {
  return (
    <ActionForm
      action={createTypeAction}
      className="grid items-end gap-3 md:grid-cols-[2fr_1fr_1fr_1.5fr_0.7fr_auto]"
    >
      <div className="space-y-1">
        <Label htmlFor="type-name" className="text-xs">
          Nombre
        </Label>
        <Input
          id="type-name"
          name="name"
          required
          placeholder="Timer SpeedStack G5 mat chico"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="type-prefix" className="text-xs">
          Prefijo SKU
        </Label>
        <Input
          id="type-prefix"
          name="skuPrefix"
          required
          maxLength={6}
          placeholder="SG5C"
          className="uppercase"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="type-category" className="text-xs">
          Categoría
        </Label>
        <NativeSelect id="type-category" name="category" defaultValue="timer">
          {(Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[]).map(
            (value) => (
              <option key={value} value={value}>
                {EQUIPMENT_CATEGORY_LABELS[value]}
              </option>
            ),
          )}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="type-tracking" className="text-xs">
          Seguimiento
        </Label>
        <NativeSelect
          id="type-tracking"
          name="tracking"
          defaultValue="serialized"
        >
          {(Object.keys(EQUIPMENT_TRACKING_LABELS) as EquipmentTracking[]).map(
            (value) => (
              <option key={value} value={value}>
                {EQUIPMENT_TRACKING_LABELS[value]}
              </option>
            ),
          )}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="type-order" className="text-xs">
          Orden
        </Label>
        <Input
          id="type-order"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={0}
        />
      </div>
      <SubmitButton>Agregar</SubmitButton>
    </ActionForm>
  );
}
