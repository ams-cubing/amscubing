"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Holiday } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import {
  createHoliday,
  deleteHoliday,
  updateHoliday,
} from "../_actions/holiday-actions";

type HolidayFormState = {
  name: string;
  date: string;
  official: boolean;
};

const emptyForm = (year: number): HolidayFormState => ({
  name: "",
  date: `${year}-01-01`,
  official: false,
});

function formatDateDisplay(date: string) {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}/${m}/${y}`;
}

export function HolidaysManager({
  year,
  years,
  holidays,
}: {
  year: number;
  years: number[];
  holidays: Holiday[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Holiday | null>(null);
  const [form, setForm] = React.useState<HolidayFormState>(() =>
    emptyForm(year),
  );
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(year));
    setDialogOpen(true);
  }

  function openEdit(holiday: Holiday) {
    setEditing(holiday);
    setForm({
      name: holiday.name,
      date: holiday.date,
      official: holiday.official,
    });
    setDialogOpen(true);
  }

  function onYearChange(value: string) {
    router.push(`/panel/feriados?year=${value}`);
  }

  function handleSave() {
    startTransition(async () => {
      const result = editing
        ? await updateHoliday(editing.id, form)
        : await createHoliday(form);

      if (result.success) {
        toast.success(result.message);
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleDelete() {
    if (deleteId == null) return;
    startTransition(async () => {
      const result = await deleteHoliday(deleteId);
      if (result.success) {
        toast.success(result.message);
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="holiday-year" className="shrink-0">
            Año
          </Label>
          <Select value={String(year)} onValueChange={onYearChange}>
            <SelectTrigger id="holiday-year" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo feriado
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  No hay feriados registrados para {year}.
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDateDisplay(holiday.date)}
                  </TableCell>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell>
                    {holiday.official ? (
                      <Badge>Oficial</Badge>
                    ) : (
                      <Badge variant="secondary">No oficial</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${holiday.name}`}
                        onClick={() => openEdit(holiday)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar ${holiday.name}`}
                        onClick={() => setDeleteId(holiday.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar feriado" : "Nuevo feriado"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Nombre</Label>
              <Input
                id="holiday-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Día de la Independencia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Fecha</Label>
              <Input
                id="holiday-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="holiday-official"
                checked={form.official}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    official: checked === true,
                  }))
                }
              />
              <Label htmlFor="holiday-official">Feriado oficial</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={pending || !form.name.trim()}
            >
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar feriado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ¿Seguro que deseas eliminar este feriado? Esta acción no se puede
            deshacer.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
