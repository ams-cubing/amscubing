"use client";

import { ActionForm } from "@workspace/ui/components/action-form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from "@workspace/db/equipment-labels";
import type { EquipmentPerson } from "@workspace/db/equipment";

import { transferItemsAction, updateItemAction } from "../_actions/inventory";
import { FormDialog } from "./form-dialog";
import { SubmitButton } from "./submit-button";

export function ItemEditForm({
  itemId,
  status,
  notes,
  onLoan,
}: {
  itemId: number;
  status: EquipmentStatus;
  notes: string | null;
  onLoan: boolean;
}) {
  return (
    <ActionForm action={updateItemAction} className="space-y-4">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="space-y-2">
        <Label htmlFor="item-status">Estado</Label>
        <NativeSelect id="item-status" name="status" defaultValue={status}>
          {(Object.keys(EQUIPMENT_STATUS_LABELS) as EquipmentStatus[]).map(
            (value) => (
              <option
                key={value}
                value={value}
                disabled={onLoan && value === "retired"}
              >
                {EQUIPMENT_STATUS_LABELS[value]}
              </option>
            ),
          )}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-notes">Notas</Label>
        <Textarea
          id="item-notes"
          name="notes"
          defaultValue={notes ?? ""}
          rows={3}
          placeholder="A veces hace falso, se rompió el cargador…"
        />
      </div>
      <SubmitButton>Guardar cambios</SubmitButton>
    </ActionForm>
  );
}

export function ItemTransferDialog({
  itemId,
  sku,
  currentGuardianId,
  guardians,
  disabled,
}: {
  itemId: number;
  sku: string;
  currentGuardianId: string | null;
  guardians: EquipmentPerson[];
  disabled: boolean;
}) {
  return (
    <FormDialog
      title={`Transferir ${sku}`}
      description="El nuevo guardián recibirá una notificación."
      action={transferItemsAction}
      submitLabel="Transferir"
      trigger={
        <Button variant="outline" disabled={disabled}>
          Transferir a otro guardián
        </Button>
      }
    >
      <input type="hidden" name="itemIds" value={JSON.stringify([itemId])} />
      <div className="space-y-2">
        <Label>Nuevo guardián</Label>
        <NativeSelect name="toUserId" required defaultValue="">
          <option value="" disabled>
            Selecciona un delegado
          </option>
          {guardians
            .filter((g) => g.id !== currentGuardianId)
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label>Nota (opcional)</Label>
        <Input name="note" />
      </div>
    </FormDialog>
  );
}
