"use client";

import type { BetaFeatureKey } from "@workspace/db/beta-feature-labels";
import { ActionForm } from "@workspace/ui/components/action-form";

import { SubmitButton } from "../equipo/_components/submit-button";
import { setBetaFeatureAction } from "./actions";

export function RevokeBetaFeatureForm({
  userId,
  featureKey,
  featureLabel,
}: {
  userId: string;
  featureKey: BetaFeatureKey;
  featureLabel: string;
}) {
  return (
    <ActionForm
      action={setBetaFeatureAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `¿Quitar el acceso beta «${featureLabel}» a esta persona?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="featureKey" value={featureKey} />
      <input type="hidden" name="enabled" value="0" />
      <SubmitButton variant="outline" size="sm" pendingLabel="Quitando…">
        Quitar
      </SubmitButton>
    </ActionForm>
  );
}
