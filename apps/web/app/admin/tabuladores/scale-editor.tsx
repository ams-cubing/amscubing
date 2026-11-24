"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { AmsCompetitionTierStored } from "@workspace/db/ams-competition-scale";
import { Button } from "@workspace/ui/components/button";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  saveCompetitionScaleConfigAction,
  type ScaleConfigView,
} from "./actions";

type DraftRow = {
  key: string;
  level: string;
  labelEs: string;
  maxCompetitors: string;
  maxStations: string;
  maxEvents: string;
  minDelegates: string;
  delegatesOpenEnded: boolean;
  minOrganizerCompetitions: string;
};

function toDraft(tiers: AmsCompetitionTierStored[]): DraftRow[] {
  return tiers.map((tier, index) => ({
    key: `${tier.level}-${index}`,
    level: tier.level,
    labelEs: tier.labelEs,
    maxCompetitors:
      tier.maxCompetitors == null ? "" : String(tier.maxCompetitors),
    maxStations: tier.maxStations == null ? "" : String(tier.maxStations),
    maxEvents: String(tier.maxEvents),
    minDelegates: String(tier.minDelegates),
    delegatesOpenEnded: tier.delegatesOpenEnded,
    minOrganizerCompetitions: String(tier.minOrganizerCompetitions),
  }));
}

function draftsToPayload(drafts: DraftRow[]): unknown[] {
  return drafts.map((row, index) => {
    const isLast = index === drafts.length - 1;
    return {
      level: row.level,
      labelEs: row.labelEs,
      maxCompetitors: isLast
        ? null
        : row.maxCompetitors.trim() === ""
          ? null
          : Number(row.maxCompetitors),
      maxStations: isLast
        ? null
        : row.maxStations.trim() === ""
          ? null
          : Number(row.maxStations),
      maxEvents: Number(row.maxEvents),
      minDelegates: Number(row.minDelegates),
      delegatesOpenEnded: isLast ? true : row.delegatesOpenEnded,
      minOrganizerCompetitions: Number(row.minOrganizerCompetitions),
    };
  });
}

function emptyRow(index: number): DraftRow {
  return {
    key: `nuevo-${Date.now()}-${index}`,
    level: "",
    labelEs: "",
    maxCompetitors: "",
    maxStations: "",
    maxEvents: "8",
    minDelegates: "1",
    delegatesOpenEnded: false,
    minOrganizerCompetitions: "1",
  };
}

const updatedFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

export function ScaleEditor({ initial }: { initial: ScaleConfigView }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(() => toDraft(initial.tiers));
  const payload = useMemo(() => JSON.stringify(draftsToPayload(drafts)), [drafts]);

  useEffect(() => {
    setDrafts(toDraft(initial.tiers));
  }, [initial.tiers, initial.updatedAt]);

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setDrafts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function moveRow(index: number, delta: number) {
    setDrafts((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row!);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="ams-copy text-sm text-black/60">
        {initial.updatedAt ? (
          <>
            Última actualización:{" "}
            {updatedFormat.format(new Date(initial.updatedAt))}
            {initial.updatedByName ? ` · ${initial.updatedByName}` : null}
          </>
        ) : (
          <>Sin cambios guardados aún (valores por defecto AMS).</>
        )}
      </div>

      <ActionForm
        action={saveCompetitionScaleConfigAction}
        onSuccess={() => router.refresh()}
        className="space-y-6"
      >
        <input type="hidden" name="tiers" value={payload} />

        <div className="overflow-x-auto rounded-5.5 bg-ams-soft p-4 md:p-6">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead>
              <tr className="text-ams-navy">
                <th className="px-2 py-2">Nivel</th>
                <th className="px-2 py-2">Competidores máx.</th>
                <th className="px-2 py-2">Estaciones máx.</th>
                <th className="px-2 py-2">Categorías</th>
                <th className="px-2 py-2">Delegados</th>
                <th className="px-2 py-2">Experiencia</th>
                <th className="px-2 py-2">Orden</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((row, index) => {
                const isLast = index === drafts.length - 1;
                return (
                  <tr key={row.key} className="align-top">
                    <td className="px-2 py-2">
                      <Label className="sr-only" htmlFor={`label-${row.key}`}>
                        Nombre del nivel
                      </Label>
                      <Input
                        id={`label-${row.key}`}
                        value={row.labelEs}
                        onChange={(event) =>
                          updateRow(index, { labelEs: event.target.value })
                        }
                        placeholder="p. ej. Experto"
                      />
                    </td>
                    <td className="px-2 py-2">
                      {isLast ? (
                        <span className="ams-copy text-sm text-black/55">
                          Sin tope
                        </span>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={row.maxCompetitors}
                          onChange={(event) =>
                            updateRow(index, {
                              maxCompetitors: event.target.value,
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {isLast ? (
                        <span className="ams-copy text-sm text-black/55">
                          Sin tope
                        </span>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={row.maxStations}
                          onChange={(event) =>
                            updateRow(index, {
                              maxStations: event.target.value,
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min={1}
                        value={row.maxEvents}
                        onChange={(event) =>
                          updateRow(index, { maxEvents: event.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={row.minDelegates}
                          onChange={(event) =>
                            updateRow(index, {
                              minDelegates: event.target.value,
                            })
                          }
                          className="w-20"
                        />
                        <label className="ams-copy flex items-center gap-1 text-xs text-black/60">
                          <input
                            type="checkbox"
                            checked={isLast ? true : row.delegatesOpenEnded}
                            disabled={isLast}
                            onChange={(event) =>
                              updateRow(index, {
                                delegatesOpenEnded: event.target.checked,
                              })
                            }
                          />
                          +
                        </label>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min={1}
                        value={row.minOrganizerCompetitions}
                        onChange={(event) =>
                          updateRow(index, {
                            minOrganizerCompetitions: event.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => moveRow(index, -1)}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === drafts.length - 1}
                          onClick={() => moveRow(index, 1)}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={drafts.length <= 3}
                          onClick={() =>
                            setDrafts((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          Quitar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={drafts.length >= 10}
            onClick={() =>
              setDrafts((prev) => {
                if (prev.length >= 10) return prev;
                const next = [...prev];
                next.splice(next.length - 1, 0, emptyRow(next.length));
                return next;
              })
            }
          >
            Agregar nivel
          </Button>
          <Button type="submit">Guardar tabuladores</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDrafts(toDraft(initial.tiers))}
          >
            Restablecer edición
          </Button>
        </div>

        <p className="ams-copy text-sm text-black/55">
          Entre 3 y 10 niveles. El último nivel siempre queda sin tope de
          competidores ni estaciones. Tras guardar, la página pública y los
          tableros usan la nueva escala (la caché pública puede tardar hasta ~1
          h).
        </p>
      </ActionForm>
    </div>
  );
}
