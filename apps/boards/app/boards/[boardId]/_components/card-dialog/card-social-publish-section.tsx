"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";

import { SOCIAL_PUBLISH_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { useUploadThing } from "@/lib/uploadthing-client";

import { saveCompetitionSocialFields } from "../../_actions/social-publish-actions";
import type { BoardDetail } from "../../_lib/types";

export function isSocialPublishCard(title: string) {
  return title.trim() === SOCIAL_PUBLISH_CARD_TITLE;
}

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; caption: string; imageUrl: string | null }
  | { status: "error"; message: string };

export function CardSocialPublishSection({
  board,
  cardId,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const competition = board.competition;
  const [customText, setCustomText] = React.useState(
    competition?.socialCustomText ?? "",
  );
  const [tags, setTags] = React.useState(competition?.socialTags ?? "");
  const [flyerUrl, setFlyerUrl] = React.useState(
    competition?.socialFlyerUrl ?? null,
  );
  const [pending, startTransition] = React.useTransition();
  const [preview, setPreview] = React.useState<PreviewState>({ status: "idle" });

  React.useEffect(() => {
    setCustomText(competition?.socialCustomText ?? "");
    setTags(competition?.socialTags ?? "");
    setFlyerUrl(competition?.socialFlyerUrl ?? null);
  }, [
    competition?.socialCustomText,
    competition?.socialTags,
    competition?.socialFlyerUrl,
  ]);

  const { startUpload, isUploading } = useUploadThing("socialFlyer", {
    onClientUploadComplete: (files) => {
      const url = files[0]?.serverData?.url ?? files[0]?.ufsUrl ?? files[0]?.url;
      if (url) {
        setFlyerUrl(url);
        toast.success("Flyer subido");
      }
    },
    onUploadError: (error) => {
      toast.error(error.message || "Error al subir el flyer");
    },
  });

  const loadPreview = React.useCallback(
    (text: string, tagValue: string, flyer: string | null) => {
      if (!competition || !text.trim()) {
        setPreview({ status: "idle" });
        return;
      }
      setPreview({ status: "loading" });
      startTransition(async () => {
        try {
          const res = await fetch("/api/social-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wcaCompetitionUrl: competition.wcaCompetitionUrl,
              city: competition.city,
              stateName: competition.state?.name ?? null,
              name: competition.name,
              startDate: competition.startDate,
              endDate: competition.endDate,
              capacity: competition.capacity,
              socialCustomText: text,
              socialTags: tagValue,
              socialFlyerUrl: flyer,
            }),
          });
          const data = (await res.json()) as
            | { ok: true; caption: string; imageUrl: string | null }
            | { ok: false; message: string };
          if (!data.ok) {
            setPreview({ status: "error", message: data.message });
            return;
          }
          setPreview({
            status: "ok",
            caption: data.caption,
            imageUrl: data.imageUrl,
          });
        } catch {
          setPreview({
            status: "error",
            message: "No se pudo generar el preview",
          });
        }
      });
    },
    [competition],
  );

  React.useEffect(() => {
    if (!competition || !customText.trim()) {
      setPreview({ status: "idle" });
      return;
    }
    const timer = window.setTimeout(() => {
      loadPreview(customText, tags, flyerUrl);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [competition, customText, tags, flyerUrl, loadPreview]);

  if (!competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Publicación redes</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia; no se pueden guardar
          datos de publicación.
        </p>
      </section>
    );
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveCompetitionSocialFields({
        boardId: board.id,
        cardId,
        customText,
        tags,
        flyerUrl,
      });
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Publicación redes</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Texto, etiquetas y flyer para Torneo de Rubik. Fechas, sede,
          categorías y cupo salen de la WCA.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`social-text-${cardId}`}>Texto personalizado</Label>
        <Textarea
          id={`social-text-${cardId}`}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={8}
          disabled={readOnly || pending}
          placeholder="Historia / copy creativo del anuncio…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`social-tags-${cardId}`}>
          Equipos / cuentas a etiquetar
        </Label>
        <Input
          id={`social-tags-${cardId}`}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={readOnly || pending}
          placeholder="@equipo Nombre del Team"
        />
      </div>

      <div className="space-y-2">
        <Label>Flyer (opcional)</Label>
        {flyerUrl ? (
          <div className="relative h-40 w-full overflow-hidden rounded-md border bg-muted/30">
            <Image
              src={flyerUrl}
              alt="Flyer redes"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">Sin flyer todavía</p>
        )}
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading || pending}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  await startUpload([file], { boardId: board.id });
                };
                input.click();
              }}
            >
              {isUploading ? "Subiendo…" : "Subir flyer"}
            </Button>
            {flyerUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setFlyerUrl(null)}
              >
                Quitar flyer
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {!readOnly ? (
          <Button
            type="button"
            size="sm"
            disabled={pending || isUploading || !customText.trim()}
            onClick={handleSave}
          >
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        ) : null}
      </div>

      {preview.status === "loading" ? (
        <p className="text-muted-foreground text-sm">Actualizando preview…</p>
      ) : null}
      {preview.status === "error" ? (
        <p className="text-destructive text-sm">{preview.message}</p>
      ) : null}
      {preview.status === "ok" ? (
        <div className="space-y-3 rounded-md border bg-muted/20 p-3">
          {preview.imageUrl ? (
            <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-md bg-background">
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
              Sin imagen (solo Facebook con enlace)
            </p>
          )}
          <pre className="whitespace-pre-wrap text-sm leading-6">
            {preview.caption}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
