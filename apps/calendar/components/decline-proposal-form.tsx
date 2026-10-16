"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";

import { DECLINE_REASON_MAX_LENGTH } from "@/lib/decline-reason";
import type { ReassignmentOption } from "@/lib/reassignment-option";

export type { ReassignmentOption };

const NONE_VALUE = "__none__";

export function DeclineProposalForm({
  candidates,
  pending,
  onCancel,
  onConfirm,
}: {
  candidates: ReassignmentOption[];
  pending: boolean;
  onCancel: () => void;
  onConfirm: (input: {
    reason: string;
    replacementWcaId: string | null;
  }) => void;
}) {
  const [reason, setReason] = useState("");
  const [replacementValue, setReplacementValue] = useState(NONE_VALUE);

  const eligibleCount = candidates.filter((c) => c.eligible).length;

  return (
    <div className="space-y-3 border-t border-amber-500/30 pt-3">
      <div className="space-y-1.5">
        <Label htmlFor="decline-reason">Motivo para el organizador</Label>
        <Textarea
          id="decline-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={DECLINE_REASON_MAX_LENGTH}
          rows={3}
          disabled={pending}
          placeholder="Explica por qué rechazas la propuesta…"
        />
        <p className="text-xs text-muted-foreground">
          Este mensaje se envía al organizador por correo.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="decline-replacement">Reasignar a (opcional)</Label>
        <Select
          value={replacementValue}
          onValueChange={setReplacementValue}
          disabled={pending}
        >
          <SelectTrigger id="decline-replacement" className="w-full">
            <SelectValue placeholder="Sin reasignar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>
              Sin reasignar — dejar sin delegado
            </SelectItem>
            {candidates.map((candidate) => {
              const availabilityLabel = `${candidate.availableDays}/${candidate.requiredDays} días`;
              const regionLabel = candidate.regionDisplayName ?? "Sin región";
              const suffix = candidate.eligible
                ? availabilityLabel
                : `${availabilityLabel} · no elegible`;

              return (
                <SelectItem
                  key={candidate.wcaId}
                  value={candidate.wcaId}
                  disabled={!candidate.eligible}
                >
                  {candidate.name} ({candidate.wcaId}) · {regionLabel} ·{" "}
                  {suffix}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {eligibleCount === 0
            ? "Ningún otro delegado está disponible para esas fechas. Puedes rechazar sin reasignar."
            : `${eligibleCount} delegado${eligibleCount === 1 ? "" : "s"} disponible${eligibleCount === 1 ? "" : "s"}. Solo se pueden elegir quienes cubren todas las fechas sin conflictos.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={pending || !reason.trim()}
          onClick={() => {
            onConfirm({
              reason,
              replacementWcaId:
                replacementValue === NONE_VALUE ? null : replacementValue,
            });
          }}
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Confirmar rechazo
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
