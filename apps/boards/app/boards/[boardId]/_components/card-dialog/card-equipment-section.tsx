"use client";

import * as React from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

import { EQUIPMENT_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import {
  EDITABLE_REQUEST_STATUSES,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_REQUEST_STATUS_LABELS,
  type EquipmentCategory,
} from "@workspace/db/equipment-labels";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  loadEquipmentCard,
  saveEquipmentRequestFromCard,
  type EquipmentCardData,
} from "../../_actions/equipment-request-actions";
import type { BoardDetail } from "../../_lib/types";

export function isEquipmentCard(title: string) {
  return title.trim() === EQUIPMENT_CARD_TITLE;
}

const CATEGORY_ORDER: EquipmentCategory[] = [
  "timer",
  "display",
  "accessory",
  "other",
];

function quantitiesFrom(data: EquipmentCardData | null) {
  const map: Record<number, string> = {};
  for (const line of data?.sheet.request?.lines ?? []) {
    map[line.typeId] = String(line.quantity);
  }
  return map;
}

export function CardEquipmentSection({
  board,
  cardId,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const [data, setData] = React.useState<EquipmentCardData | null>();
  const [quantities, setQuantities] = React.useState<Record<number, string>>(
    {},
  );
  const [notes, setNotes] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const apply = React.useCallback((next: EquipmentCardData | null) => {
    setData(next);
    setQuantities(quantitiesFrom(next));
    setNotes(next?.sheet.request?.notes ?? "");
  }, []);

  React.useEffect(() => {
    if (!board.competition) return;
    let cancelled = false;
    loadEquipmentCard({ boardId: board.id, cardId })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) apply(result.data);
        else {
          setData(null);
          toast.error(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          toast.error("No se pudo cargar la solicitud de equipo");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apply, board.competition, board.id, cardId]);

  if (!board.competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Solicitud de equipo</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia; no se puede solicitar
          equipo.
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Solicitud de equipo</h3>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Solicitud de equipo</h3>
        <p className="text-muted-foreground text-sm">
          No se pudo cargar la información de equipo.
        </p>
      </section>
    );
  }

  const { sheet, types, hasDelegates } = data;
  const request = sheet.request;
  const editable =
    !readOnly &&
    (!request || EDITABLE_REQUEST_STATUSES.includes(request.status));
  const requestedTypeIds = new Set(request?.lines.map((line) => line.typeId));
  const visibleTypes = types.filter(
    (type) => type.available > 0 || requestedTypeIds.has(type.id),
  );
  const confirmation = sheet.confirmation;

  const save = (submit: boolean) => {
    const lines = Object.entries(quantities)
      .map(([typeId, value]) => ({
        typeId: Number(typeId),
        quantity: Number(value || 0),
      }))
      .filter((line) => line.quantity > 0);
    if (lines.some((line) => !Number.isInteger(line.quantity))) {
      toast.error("Las cantidades deben ser números enteros");
      return;
    }
    const tooMany = lines
      .map((line) => ({
        line,
        type: types.find((type) => type.id === line.typeId),
      }))
      .find(({ line, type }) => line.quantity > (type?.available ?? 0));
    if (tooMany) {
      toast.error(
        `Solo hay ${tooMany.type?.available ?? 0} ${tooMany.type?.name ?? "equipo"} disponibles con los delegados`,
      );
      return;
    }
    startTransition(async () => {
      const result = await saveEquipmentRequestFromCard({
        boardId: board.id,
        cardId,
        lines,
        notes,
        submit,
      });
      if (result.ok) {
        apply(result.data);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Solicitud de equipo</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Indica cuánto equipo necesita la competencia. El delegado revisa la
            solicitud y confirma los SKUs que llevará a la competencia.
          </p>
        </div>
        {request ? (
          <Badge variant={request.status === "fulfilled" ? "brand" : "outline"}>
            {EQUIPMENT_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        ) : null}
      </div>

      {editable ? (
        <div className="space-y-4">
          {visibleTypes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {hasDelegates
                ? "Los delegados de la competencia no tienen equipo disponible a su cargo."
                : "La competencia aún no tiene delegados confirmados. Cuando los tenga verás aquí el equipo que tienen a su cargo."}
            </p>
          ) : null}
          {CATEGORY_ORDER.map((category) => {
            const group = visibleTypes.filter(
              (type) => type.category === category,
            );
            if (group.length === 0) return null;
            return (
              <div key={category} className="space-y-2">
                <p className="text-muted-foreground text-xs font-semibold uppercase">
                  {EQUIPMENT_CATEGORY_LABELS[category]}
                </p>
                <div className="grid gap-2">
                  {group.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <Label
                        htmlFor={`equipment-${cardId}-${type.id}`}
                        className="min-w-0 flex-1 flex-col items-start gap-1 text-sm leading-5 font-normal"
                      >
                        {type.name}
                        <span className="text-muted-foreground text-xs">
                          {type.available} disponibles con los delegados
                        </span>
                      </Label>
                      <Input
                        id={`equipment-${cardId}-${type.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={type.available}
                        className="w-24 shrink-0"
                        value={quantities[type.id] ?? ""}
                        placeholder="0"
                        disabled={pending}
                        onChange={(e) => {
                          const value = e.target.value;
                          setQuantities((prev) => ({
                            ...prev,
                            [type.id]:
                              value === ""
                                ? ""
                                : String(
                                    Math.min(
                                      type.available,
                                      Math.max(
                                        0,
                                        Math.trunc(Number(value) || 0),
                                      ),
                                    ),
                                  ),
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="space-y-2">
            <Label htmlFor={`equipment-notes-${cardId}`}>Notas</Label>
            <Textarea
              id={`equipment-notes-${cardId}`}
              value={notes}
              maxLength={2000}
              disabled={pending}
              placeholder="Horario de entrega, estaciones, dudas para el delegado…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => save(false)}
            >
              Guardar borrador
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => save(true)}
            >
              {request?.status === "submitted"
                ? "Reenviar al delegado"
                : "Enviar al delegado"}
            </Button>
          </div>
        </div>
      ) : request ? (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">
            Solicitado
          </p>
          <p>{request.summary || "Sin renglones"}</p>
          {request.notes ? (
            <p className="text-muted-foreground text-xs whitespace-pre-line">
              {request.notes}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Aún no hay solicitud de equipo.
        </p>
      )}

      {confirmation && confirmation.lines.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase">
            Equipo confirmado
          </p>
          {confirmation.confirmedBy ? (
            <p className="text-muted-foreground text-xs">
              Confirmó {confirmation.confirmedBy.name}
            </p>
          ) : null}
          <ul className="space-y-1 rounded-md border p-3 text-sm">
            {confirmation.lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {line.typeName}{" "}
                  <span className="text-muted-foreground font-mono text-xs">
                    {line.sku ?? `× ${line.quantity}`}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  Lo lleva {line.guardian.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {confirmation ? (
        <Button type="button" size="sm" variant="outline" asChild>
          <a
            href={`/boards/${board.id}/equipo/ficha`}
            target="_blank"
            rel="noreferrer"
          >
            <FileDown />
            Descargar ficha (PDF)
          </a>
        </Button>
      ) : null}
    </section>
  );
}
