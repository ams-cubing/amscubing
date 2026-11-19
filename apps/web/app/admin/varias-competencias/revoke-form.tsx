"use client";

import { ActionForm } from "@workspace/ui/components/action-form";

import { SubmitButton } from "../equipo/_components/submit-button";
import { setMultiCompetitionOrganizerAction } from "./actions";

export function RevokeMultiCompetitionForm({ userId }: { userId: string }) {
  return (
    <ActionForm
      action={setMultiCompetitionOrganizerAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "¿Quitar el permiso de organizar varias competencias a la vez?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="allow" value="0" />
      <SubmitButton variant="outline" size="sm" pendingLabel="Quitando…">
        Quitar
      </SubmitButton>
    </ActionForm>
  );
}
