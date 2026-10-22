"use client";

import { ArrowRightLeft, NotebookPen, SlidersHorizontal } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { Textarea } from "@workspace/ui/components/textarea";
import type { EquipmentPerson } from "@workspace/db/equipment";

import {
  adjustStockAction,
  setStockNotesAction,
  transferStockAction,
} from "../_actions/inventory";
import { FormDialog } from "./form-dialog";

export function StockActions({
  typeId,
  typeName,
  guardian,
  quantity,
  onLoan,
  notes,
  guardians,
}: {
  typeId: number;
  typeName: string;
  guardian: EquipmentPerson;
  quantity: number;
  onLoan: number;
  notes: string | null;
  guardians: EquipmentPerson[];
}) {
  const available = Math.max(0, quantity - onLoan);
  const hidden = (
    <>
      <input type="hidden" name="typeId" value={typeId} />
      <input type="hidden" name="guardianUserId" value={guardian.id} />
    </>
  );

  return (
    <div className="flex gap-1">
      <FormDialog
        title={`Ajustar ${typeName}`}
        description={`${guardian.name} tiene ${quantity} (${onLoan} prestados). Usa negativos para pérdidas o correcciones.`}
        action={adjustStockAction}
        trigger={
          <Button size="icon" variant="ghost" aria-label="Ajustar cantidad">
            <SlidersHorizontal className="size-4" />
          </Button>
        }
      >
        {hidden}
        <div className="space-y-2">
          <Label htmlFor={`delta-${typeId}-${guardian.id}`}>Cambio</Label>
          <Input
            id={`delta-${typeId}-${guardian.id}`}
            name="delta"
            type="number"
            step={1}
            placeholder="-2 o 5"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`reason-${typeId}-${guardian.id}`}>Motivo</Label>
          <Input
            id={`reason-${typeId}-${guardian.id}`}
            name="reason"
            placeholder="Extraviados en Nacional 2026"
            required
          />
        </div>
      </FormDialog>

      <FormDialog
        title={`Transferir ${typeName}`}
        description={`Disponibles para mover: ${available}.`}
        action={transferStockAction}
        submitLabel="Transferir"
        trigger={
          <Button
            size="icon"
            variant="ghost"
            aria-label="Transferir a otro guardián"
            disabled={available === 0}
          >
            <ArrowRightLeft className="size-4" />
          </Button>
        }
      >
        <input type="hidden" name="typeId" value={typeId} />
        <input type="hidden" name="fromUserId" value={guardian.id} />
        <div className="space-y-2">
          <Label>Nuevo guardián</Label>
          <NativeSelect name="toUserId" required defaultValue="">
            <option value="" disabled>
              Selecciona un delegado
            </option>
            {guardians
              .filter((g) => g.id !== guardian.id)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label>Cantidad</Label>
          <Input
            name="quantity"
            type="number"
            min={1}
            max={available}
            defaultValue={available}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Nota (opcional)</Label>
          <Input name="note" />
        </div>
      </FormDialog>

      <FormDialog
        title={`Notas de ${typeName}`}
        action={setStockNotesAction}
        trigger={
          <Button size="icon" variant="ghost" aria-label="Editar notas">
            <NotebookPen className="size-4" />
          </Button>
        }
      >
        {hidden}
        <Textarea name="notes" defaultValue={notes ?? ""} rows={4} />
      </FormDialog>
    </div>
  );
}
