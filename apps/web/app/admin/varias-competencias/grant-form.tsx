"use client";

import { useState } from "react";

import { ActionForm } from "@workspace/ui/components/action-form";
import { Label } from "@workspace/ui/components/label";

import {
  OrganizerCombobox,
  organizerSubtitle,
  type OrganizerOption,
} from "../equipo/_components/organizer-combobox";
import { SubmitButton } from "../equipo/_components/submit-button";
import { setMultiCompetitionOrganizerAction } from "./actions";

export function GrantMultiCompetitionForm({
  excludedUserIds,
}: {
  excludedUserIds: string[];
}) {
  const [selected, setSelected] = useState<OrganizerOption | null>(null);

  return (
    <ActionForm
      action={setMultiCompetitionOrganizerAction}
      onSuccess={() => setSelected(null)}
      className="space-y-4"
    >
      <input type="hidden" name="allow" value="1" />
      <input type="hidden" name="userId" value={selected?.id ?? ""} />

      <div className="space-y-2">
        <Label>Organizador</Label>
        <OrganizerCombobox
          value=""
          selectedOrganizers={excludedUserIds}
          onSelect={setSelected}
          placeholder="Buscar por nombre, WCA ID o correo…"
          noun={{ singular: "organizador", plural: "organizadores" }}
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

      <SubmitButton disabled={!selected}>Permitir varias a la vez</SubmitButton>
    </ActionForm>
  );
}
