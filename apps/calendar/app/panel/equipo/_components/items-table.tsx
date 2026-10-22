"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NativeSelect } from "@workspace/ui/components/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from "@workspace/db/equipment-labels";
import type {
  EquipmentItemRow,
  EquipmentPerson,
} from "@workspace/db/equipment";

import { transferItemsAction } from "../_actions/inventory";
import { EquipmentStatusBadge } from "./badges";
import { FormDialog } from "./form-dialog";

const ALL = "";

export function ItemsTable({
  items,
  guardians,
}: {
  items: EquipmentItemRow[];
  guardians: EquipmentPerson[];
}) {
  const [query, setQuery] = useState("");
  const [typeName, setTypeName] = useState(ALL);
  const [guardianId, setGuardianId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const typeNames = useMemo(
    () => [...new Set(items.map((item) => item.typeName))],
    [items],
  );
  const sources = useMemo(
    () =>
      [
        ...new Set(items.map((item) => item.source).filter(Boolean)),
      ] as string[],
    [items],
  );
  const holders = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.guardian) map.set(item.guardian.id, item.guardian.name);
    }
    return [...map].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return items.filter(
      (item) =>
        (!q || item.sku.includes(q) || item.notes?.toUpperCase().includes(q)) &&
        (!typeName || item.typeName === typeName) &&
        (!guardianId || item.guardian?.id === guardianId) &&
        (!status ||
          (status === "on_loan"
            ? item.onLoanId != null
            : item.status === status)) &&
        (!source || item.source === source),
    );
  }, [items, query, typeName, guardianId, status, source]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectable = filtered.filter((item) => item.onLoanId == null);
  const allSelected =
    selectable.length > 0 && selectable.every((item) => selected.has(item.id));

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Buscar SKU o nota"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NativeSelect
          value={typeName}
          onChange={(e) => setTypeName(e.target.value)}
        >
          <option value={ALL}>Todos los equipos</option>
          {typeNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={guardianId}
          onChange={(e) => setGuardianId(e.target.value)}
        >
          <option value={ALL}>Todos los guardianes</option>
          {holders.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value={ALL}>Todos los estados</option>
          {(Object.keys(EQUIPMENT_STATUS_LABELS) as EquipmentStatus[])
            .filter((s) => s !== "retired")
            .map((s) => (
              <option key={s} value={s}>
                {EQUIPMENT_STATUS_LABELS[s]}
              </option>
            ))}
          <option value="on_loan">Prestados</option>
        </NativeSelect>
        <NativeSelect
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value={ALL}>Toda procedencia</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {filtered.length} de {items.length} unidades
          {selected.size > 0 ? ` · ${selected.size} seleccionadas` : ""}
        </span>
        {selected.size > 0 ? (
          <FormDialog
            title={`Transferir ${selected.size} unidad(es)`}
            description="El nuevo guardián recibirá una notificación."
            action={async (state, data) => {
              const result = await transferItemsAction(state, data);
              if (result.ok) setSelected(new Set());
              return result;
            }}
            submitLabel="Transferir"
            trigger={<Button size="sm">Transferir seleccionadas</Button>}
          >
            <input
              type="hidden"
              name="itemIds"
              value={JSON.stringify([...selected])}
            />
            <div className="space-y-2">
              <Label>Nuevo guardián</Label>
              <NativeSelect name="toUserId" required defaultValue="">
                <option value="" disabled>
                  Selecciona un delegado
                </option>
                {guardians.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Input name="note" />
            </div>
          </FormDialog>
        ) : null}
      </div>

      <div className="bg-card overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  aria-label="Seleccionar todo"
                  onCheckedChange={(checked) =>
                    setSelected(
                      checked
                        ? new Set(selectable.map((item) => item.id))
                        : new Set(),
                    )
                  }
                />
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Guardián</TableHead>
              <TableHead>Procedencia</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(item.id)}
                    disabled={item.onLoanId != null}
                    aria-label={`Seleccionar ${item.sku}`}
                    onCheckedChange={() => toggle(item.id)}
                  />
                </TableCell>
                <TableCell className="font-mono">
                  <Link
                    href={
                      `/panel/equipo/${encodeURIComponent(item.sku)}` as Route
                    }
                    className="hover:underline"
                  >
                    {item.sku}
                  </Link>
                </TableCell>
                <TableCell>{item.typeName}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <EquipmentStatusBadge status={item.status} />
                    {item.onLoanId != null ? (
                      <Link
                        href={
                          `/panel/equipo/prestamos/${item.onLoanId}` as Route
                        }
                        className="text-xs text-amber-700 hover:underline"
                      >
                        Prestado
                      </Link>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{item.guardian?.name ?? "—"}</TableCell>
                <TableCell>{item.source ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {item.notes}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-8 text-center"
                >
                  Sin resultados
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
