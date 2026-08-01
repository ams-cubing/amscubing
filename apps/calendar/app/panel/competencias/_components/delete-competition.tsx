"use client";

import React, { useState, useTransition } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { deleteCompetition } from "../_actions/delete-competition";

export function DeleteCompetitionDialog({
  competitionId,
}: {
  competitionId: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = async () => {
    startTransition(async () => {
      try {
        const response = await deleteCompetition(competitionId);
        if (response.success) {
          toast.success("Competencia eliminada correctamente.");
          setOpen(false);
        } else {
          toast.error(
            response.message || "No se pudo eliminar la competencia.",
          );
        }
      } catch {
        toast.error("Ocurrió un error al eliminar la competencia.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="w-full"
          aria-label="Eliminar competencia"
        >
          <Trash />
          Eliminar competencia
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription>
            <p>
              Hazlo únicamente para casos especiales. Si la competencia ha sido
              cancelada o pospuesta, considera simplemente actualizar el
              estatus.
            </p>
            <br />
            <p>
              Esta acción eliminará la competencia permanentemente. ¿Deseas
              continuar?
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
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
  );
}
