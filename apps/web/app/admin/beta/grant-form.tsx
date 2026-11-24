"use client";

import { useState } from "react";

import {
  BETA_FEATURES,
  type BetaFeatureKey,
} from "@workspace/db/beta-feature-labels";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Label } from "@workspace/ui/components/label";

import {
  OrganizerCombobox,
  organizerSubtitle,
  type OrganizerOption,
} from "../equipo/_components/organizer-combobox";
import { SubmitButton } from "../equipo/_components/submit-button";
import { setBetaFeatureAction } from "./actions";

const FEATURE_OPTIONS = Object.entries(BETA_FEATURES) as [
  BetaFeatureKey,
  (typeof BETA_FEATURES)[BetaFeatureKey],
][];

export function GrantBetaFeatureForm() {
  const [selected, setSelected] = useState<OrganizerOption | null>(null);
  const [featureKey, setFeatureKey] = useState<BetaFeatureKey>("boards_tools");

  return (
    <ActionForm
      action={setBetaFeatureAction}
      onSuccess={() => setSelected(null)}
      className="space-y-4"
    >
      <input type="hidden" name="enabled" value="1" />
      <input type="hidden" name="userId" value={selected?.id ?? ""} />
      <input type="hidden" name="featureKey" value={featureKey} />

      <div className="space-y-2">
        <Label htmlFor="beta-feature">Función beta</Label>
        <select
          id="beta-feature"
          className="flex h-10 w-full rounded-md border border-black/15 bg-white px-3 text-sm"
          value={featureKey}
          onChange={(event) =>
            setFeatureKey(event.target.value as BetaFeatureKey)
          }
        >
          {FEATURE_OPTIONS.map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-black/55">
          {BETA_FEATURES[featureKey].description}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Usuario</Label>
        <OrganizerCombobox
          value=""
          selectedOrganizers={[]}
          onSelect={setSelected}
          placeholder="Buscar por nombre, WCA ID o correo…"
          noun={{ singular: "usuario", plural: "usuarios" }}
        />
        {selected ? (
          <p className="text-sm text-black/65">
            Seleccionado: <span className="font-medium">{selected.name}</span>
            {organizerSubtitle(selected) ? (
              <span className="text-black/50">
                {" "}
                · {organizerSubtitle(selected)}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <SubmitButton disabled={!selected}>Conceder acceso beta</SubmitButton>
    </ActionForm>
  );
}
