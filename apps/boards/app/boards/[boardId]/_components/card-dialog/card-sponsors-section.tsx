"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  formatMxnCents,
  parseMxnToCents,
  SPONSOR_TYPE_LABELS,
  type SponsorType,
} from "@workspace/db/budget-labels";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  loadBudgetCard,
  removeSponsorFromCard,
  saveSponsorFromCard,
  type BudgetCardData,
} from "../../_actions/budget-actions";
import type { BoardDetail } from "../../_lib/types";

type Draft = {
  sponsorId?: number;
  name: string;
  type: SponsorType;
  amount: string;
  conditions: string;
  logoUrl: string;
};

const EMPTY: Draft = {
  name: "",
  type: "in_kind",
  amount: "",
  conditions: "",
  logoUrl: "",
};

export function CardSponsorsSection({
  board,
  cardId,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const [data, setData] = React.useState<BudgetCardData | null>();
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!board.competition) return;
    let cancelled = false;
    loadBudgetCard({ boardId: board.id, cardId })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setData(result.data);
        else {
          setData(null);
          toast.error(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          toast.error("No se pudieron cargar los patrocinios");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [board.competition, board.id, cardId]);

  if (!board.competition) {
    return (
      <section className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Patrocinios</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia.
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Patrocinios</h3>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Patrocinios</h3>
        <p className="text-muted-foreground text-sm">
          No se pudieron cargar los patrocinios.
        </p>
      </section>
    );
  }

  function save() {
    const amountCents =
      draft.amount.trim() === "" ? null : parseMxnToCents(draft.amount);
    if (draft.amount.trim() && amountCents == null) {
      toast.error("Monto inválido");
      return;
    }
    startTransition(async () => {
      const result = await saveSponsorFromCard({
        boardId: board.id,
        cardId,
        sponsorId: draft.sponsorId,
        name: draft.name,
        type: draft.type,
        amountCents,
        conditions: draft.conditions || undefined,
        logoUrl: draft.logoUrl || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setData(result.data);
      setDraft(EMPTY);
      toast.success(result.message);
    });
  }

  return (
    <section className="space-y-4 border-t pt-4">
      <h3 className="text-sm font-semibold">Patrocinios</h3>

      <ul className="space-y-2">
        {data.sponsors.length === 0 ? (
          <li className="text-muted-foreground text-sm">
            Aún no hay patrocinadores registrados.
          </li>
        ) : (
          data.sponsors.map((sponsor) => (
            <li
              key={sponsor.id}
              className="bg-muted/40 flex flex-wrap items-start justify-between gap-2 rounded-md border p-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{sponsor.name}</p>
                  <Badge variant="outline">
                    {SPONSOR_TYPE_LABELS[sponsor.type]}
                  </Badge>
                </div>
                {sponsor.amountCents != null ? (
                  <p className="text-muted-foreground text-xs">
                    {formatMxnCents(sponsor.amountCents)}
                  </p>
                ) : null}
                {sponsor.conditions ? (
                  <p className="text-muted-foreground text-xs">
                    {sponsor.conditions}
                  </p>
                ) : null}
              </div>
              {!readOnly ? (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      setDraft({
                        sponsorId: sponsor.id,
                        name: sponsor.name,
                        type: sponsor.type,
                        amount:
                          sponsor.amountCents != null
                            ? String(sponsor.amountCents / 100)
                            : "",
                        conditions: sponsor.conditions ?? "",
                        logoUrl: sponsor.logoUrl ?? "",
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await removeSponsorFromCard({
                          boardId: board.id,
                          cardId,
                          sponsorId: sponsor.id,
                        });
                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }
                        setData(result.data);
                        toast.success(result.message);
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {!readOnly ? (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">
            {draft.sponsorId ? "Editar patrocinador" : "Agregar patrocinador"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sponsor-name">Nombre</Label>
              <Input
                id="sponsor-name"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sponsor-type">Tipo</Label>
              <select
                id="sponsor-type"
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={draft.type}
                disabled={pending}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    type: e.target.value as SponsorType,
                  }))
                }
              >
                <option value="cash">{SPONSOR_TYPE_LABELS.cash}</option>
                <option value="in_kind">{SPONSOR_TYPE_LABELS.in_kind}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sponsor-amount">Monto (MXN, opcional)</Label>
              <Input
                id="sponsor-amount"
                value={draft.amount}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, amount: e.target.value }))
                }
                disabled={pending}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sponsor-logo">URL del logo (opcional)</Label>
              <Input
                id="sponsor-logo"
                value={draft.logoUrl}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, logoUrl: e.target.value }))
                }
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sponsor-conditions">Condiciones</Label>
            <Textarea
              id="sponsor-conditions"
              value={draft.conditions}
              onChange={(e) =>
                setDraft((d) => ({ ...d, conditions: e.target.value }))
              }
              disabled={pending}
              rows={2}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={save}>
              {draft.sponsorId ? "Guardar cambios" : "Agregar"}
            </Button>
            {draft.sponsorId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setDraft(EMPTY)}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
