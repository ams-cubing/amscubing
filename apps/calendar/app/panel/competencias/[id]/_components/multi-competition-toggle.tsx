"use client";

import { ActionForm } from "@workspace/ui/components/action-form";

import { SubmitButton } from "@/app/panel/equipo/_components/submit-button";

import { setMultiCompetitionOrganizerAction } from "../_actions/multi-competition-organizer";

export function MultiCompetitionToggle({
  competitionId,
  userId,
  allowed,
}: {
  competitionId: number;
  userId: string;
  allowed: boolean;
}) {
  return (
    <ActionForm action={setMultiCompetitionOrganizerAction}>
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="allow" value={allowed ? "0" : "1"} />
      <SubmitButton
        variant={allowed ? "secondary" : "outline"}
        size="sm"
        className="h-7 px-2 text-xs"
        pendingLabel="Guardando…"
        title={
          allowed
            ? "Puede solicitar fechas aunque tenga otra competencia sin anunciar"
            : "Permitir que solicite fechas aunque tenga otra competencia sin anunciar"
        }
      >
        {allowed ? "Varias a la vez: sí" : "Permitir varias a la vez"}
      </SubmitButton>
    </ActionForm>
  );
}
