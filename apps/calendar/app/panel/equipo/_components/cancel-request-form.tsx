"use client";

import { ActionForm } from "@workspace/ui/components/action-form";

import { cancelEquipmentRequestAction } from "../_actions/requests";
import { SubmitButton } from "./submit-button";

export function CancelRequestForm({ requestId }: { requestId: number }) {
  return (
    <ActionForm
      action={cancelEquipmentRequestAction}
      onSubmit={(event) => {
        if (!window.confirm("¿Cancelar la solicitud de equipo?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton variant="ghost" size="sm" pendingLabel="Cancelando…">
        Cancelar solicitud
      </SubmitButton>
    </ActionForm>
  );
}
