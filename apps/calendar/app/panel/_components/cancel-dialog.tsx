"use client";

import React, { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import { cancelCompetition } from "../_actions/cancel-competition";

export function CancelDialog({
  competitionId,
  open,
  setOpen,
}: {
  competitionId: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [pending, startTransition] = useTransition();

  const handleCancel = () => {
    startTransition(async () => {
      try {
        const res = await cancelCompetition(competitionId);
        if (res?.success) {
          toast.success("Competencia cancelada");
          setOpen(false);
        } else {
          toast.error(res?.message || "Error al cancelar");
        }
      } catch {
        toast.error("Error al cancelar la competencia");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            Cancelar competencia
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-2 text-sm text-muted-foreground">
          <p>¿Estás seguro de que deseas cancelar esta competencia?</p>
          <p>
            El estatus público cambiará a{" "}
            <span className="font-semibold text-foreground">Suspendida</span> y
            el estatus interno a{" "}
            <span className="font-semibold text-foreground">Cancelada</span>.
          </p>
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost" className="min-w-24" disabled={pending}>
                Volver
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="min-w-30"
              disabled={pending}
              onClick={handleCancel}
            >
              {pending ? "Cancelando..." : "Cancelar competencia"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
