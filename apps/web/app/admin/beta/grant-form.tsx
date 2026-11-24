"use client";

import { useState } from "react";

import { BETA_FEATURES } from "@workspace/db/beta-feature-labels";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Label } from "@workspace/ui/components/label";

import {
  OrganizerCombobox,
  organizerSubtitle,
  type OrganizerOption,
} from "../equipo/_components/organizer-combobox";
import { SubmitButton } from "../equipo/_components/submit-button";
import { setBetaFeatureAction } from "./actions";

type BetaFeatureDef = { label: string; description: string };

const FEATURE_OPTIONS = Object.entries(BETA_FEATURES) as [
  string,
  BetaFeatureDef,
][];

export function GrantBetaFeatureForm() {
  const [selected, setSelected] = useState<OrganizerOption | null>(null);
  const [featureKey, setFeatureKey] = useState(FEATURE_OPTIONS[0]?.[0] ?? "");

  if (FEATURE_OPTIONS.length === 0) {
    return (
      <p className="ams-copy text-sm text-black/55">
        No hay funciones beta por usuario por ahora. Las herramientas nuevas del
        tablero se activan al crear o asignar el tablero en el panel del
        calendario.
      </p>
    );
  }

  const selectedFeature = FEATURE_OPTIONS.find(([key]) => key === featureKey);

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
          onChange={(event) => setFeatureKey(event.target.value)}
        >
          {FEATURE_OPTIONS.map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        {selectedFeature ? (
          <p className="text-xs text-black/55">{selectedFeature[1].description}</p>
        ) : null}
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

      <SubmitButton disabled={!selected || !featureKey}>
        Conceder acceso beta
      </SubmitButton>
    </ActionForm>
  );
}
