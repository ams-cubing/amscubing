"use client";

import { useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  createBlankBoard,
  createTemplate,
} from "@/app/_actions/board-management";

export function CreateBoardDialog({ mode }: { mode: "blank" | "template" }) {
  const [open, setOpen] = useState(false);
  const isTemplate = mode === "template";
  const title = isTemplate ? "Nueva plantilla" : "Nuevo tablero";
  const description = isTemplate
    ? "Crea una plantilla en blanco para editarla y reutilizarla."
    : "Crea un tablero en blanco, sin vincularlo a una competencia.";
  const action = isTemplate ? createTemplate : createBlankBoard;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isTemplate ? "outline" : "default"}>{title}</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor={`board-name-${mode}`}>Nombre</Label>
            <Input
              id={`board-name-${mode}`}
              name="name"
              required
              placeholder={
                isTemplate ? "Plantilla regional" : "Tablero de trabajo"
              }
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Crear</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
