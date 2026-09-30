"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import {
  previewAnnouncement,
  type AnnouncementPreview,
} from "../_actions/preview-announcement";

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
  const router = useRouter();
  const [previewPending, startPreview] = useTransition();
  const [publishPending, startPublish] = useTransition();
  const [wcaCompetitionUrl, setWcaCompetitionUrl] = useState(
    initialWcaCompetitionUrl ?? "",
  );
  const [preview, setPreview] = useState<AnnouncementPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWcaCompetitionUrl(initialWcaCompetitionUrl ?? "");
      setPreview(null);
      setPreviewError(null);
    }
  }, [open, initialWcaCompetitionUrl]);

  const pending = previewPending || publishPending;
  const trimmedUrl = wcaCompetitionUrl.trim();

  const handlePreview = () => {
    if (!trimmedUrl) {
      setPreviewError("Agrega la URL de la competencia en la WCA");
      return;
    }

    setPreviewError(null);
    startPreview(async () => {
      try {
        const res = await previewAnnouncement(competitionId, trimmedUrl);
        if (res.success) {
          setPreview(res.preview);
        } else {
          setPreviewError(res.message);
        }
      } catch {
        setPreviewError("Error al generar la previsualización");
      }
    });
  };

  const handleAnnounce = () => {
    if (!preview || publishPending) return;

    startPublish(async () => {
      try {
        const res = await markAsAnnounced(competitionId, {
          wcaCompetitionUrl: trimmedUrl,
        });
        if (res.success) {
          toast.success(res.message);
          setOpen(false);
          return;
        }
        toast.error(res.message || "Error al anunciar");
        if (res.stale) {
          setOpen(false);
          router.refresh();
        }
      } catch {
        toast.error("Error al anunciar la competencia");
        router.refresh();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (publishPending) return;
        setOpen(next);
      }}
    >
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {preview ? "Previsualizar publicación" : "Anunciar competencia"}
          </DialogTitle>
        </DialogHeader>

        {preview ? (
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Así se publicará en Facebook e Instagram de{" "}
              <span className="font-semibold text-foreground">
                Torneo de Rubik
              </span>
              . Al confirmar, la competencia en{" "}
              <span className="font-semibold text-foreground">{city}</span> se
              marcará como{" "}
              <span className="font-semibold text-foreground">Anunciada</span>.
            </p>

            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <p className="font-semibold text-foreground">
                {preview.displayName}
              </p>
              {preview.imageUrl ? (
                <div className="relative mx-auto aspect-square w-full max-w-60 overflow-hidden rounded-md bg-background">
                  <Image
                    src={preview.imageUrl}
                    alt="Imagen del post"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-xs">
                  Sin imagen: solo Facebook, Instagram se omitirá
                </p>
              )}
              <p className="max-h-64 overflow-y-auto whitespace-pre-line text-sm leading-6 text-foreground">
                {preview.caption}
              </p>
            </div>
          </div>
        ) : (
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
              La publicación solo continúa si la URL apunta a una competencia
              real en la WCA. El texto personalizado del tablero es opcional: si
              no hay, se usa la introducción en español de la página WCA.
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
                onChange={(event) => {
                  setWcaCompetitionUrl(event.target.value);
                  setPreview(null);
                  setPreviewError(null);
                }}
                disabled={pending}
              />
              {previewError ? (
                <p className="text-destructive text-sm">{previewError}</p>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          {preview ? (
            <>
              <Button
                variant="ghost"
                className="w-full sm:w-auto"
                disabled={publishPending}
                onClick={() => setPreview(null)}
              >
                Cambiar URL
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={publishPending}
                onClick={handleAnnounce}
              >
                {publishPending ? "Publicando..." : "Anunciar y publicar"}
              </Button>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto"
                  disabled={pending}
                >
                  Volver
                </Button>
              </DialogClose>
              <Button
                className="w-full sm:w-auto"
                disabled={!trimmedUrl || pending}
                onClick={handlePreview}
              >
                {previewPending ? "Generando..." : "Previsualizar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
