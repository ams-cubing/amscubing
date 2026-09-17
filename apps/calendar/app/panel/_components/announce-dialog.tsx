"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { markAsAnnounced } from "../_actions/mark-as-announced";

export function AnnounceDialog({
  competitionId,
  city,
  initialWcaCompetitionUrl,
  open,
  setOpen,
}: {
  competitionId: number;
  city: string;
  initialWcaCompetitionUrl: string | null;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [pending, startTransition] = useTransition();
  const [wcaCompetitionUrl, setWcaCompetitionUrl] = useState(
    initialWcaCompetitionUrl ?? "",
  );

  useEffect(() => {
    if (open) {
      setWcaCompetitionUrl(initialWcaCompetitionUrl ?? "");
    }
  }, [open, initialWcaCompetitionUrl]);

  const trimmedUrl = wcaCompetitionUrl.trim();
  const canSubmit = trimmedUrl.length > 0 && !pending;

  const handleAnnounce = () => {
    if (!trimmedUrl) {
      toast.error("Agrega la URL de la competencia en la WCA");
      return;
    }

    startTransition(async () => {
      try {
        const res = await markAsAnnounced(competitionId, {
          wcaCompetitionUrl: trimmedUrl,
        });
        if (res.success) {
          toast.success(res.message);
          setOpen(false);
        } else {
          toast.error(res.message || "Error al anunciar");
        }
      } catch {
        toast.error("Error al anunciar la competencia");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            Anunciar competencia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <p>
            Al confirmar, la competencia en{" "}
            <span className="font-semibold text-foreground">{city}</span> se
            marcará como{" "}
            <span className="font-semibold text-foreground">Anunciada</span> y
            se publicará automáticamente en Facebook e Instagram de{" "}
            <span className="font-semibold text-foreground">
              Torneo de Rubik
            </span>
            . Si la página WCA tiene logo, se usará en la publicación.
          </p>
          <p>
            La publicación solo continúa si la URL apunta a una competencia real
            en la WCA y el tablero tiene el texto personalizado guardado en
            «Publicación redes Torneo de Rubik».
          </p>

          <div className="space-y-2 pt-1">
            <Label
              htmlFor={`wca-url-${competitionId}`}
              className="text-foreground"
            >
              URL de la WCA
            </Label>
            <Input
              id={`wca-url-${competitionId}`}
              type="url"
              placeholder="https://www.worldcubeassociation.org/competitions/..."
              value={wcaCompetitionUrl}
              onChange={(event) => setWcaCompetitionUrl(event.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost" className="min-w-24" disabled={pending}>
                Volver
              </Button>
            </DialogClose>
            <Button
              className="min-w-36"
              disabled={!canSubmit}
              onClick={handleAnnounce}
            >
              {pending ? "Publicando..." : "Anunciar y publicar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
