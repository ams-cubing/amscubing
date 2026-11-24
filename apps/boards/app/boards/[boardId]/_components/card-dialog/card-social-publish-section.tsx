"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";

import { SOCIAL_PUBLISH_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import {
  classifyCompetitionSocialStatus,
  facebookPostHref,
} from "@workspace/social/status";
import { Button } from "@workspace/ui/components/button";
import { CompetitionSocialStatusPanel } from "@workspace/ui/components/competition-social-status-panel";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { useUploadThing } from "@/lib/uploadthing-client";

import {
  completeBoardCompetitionInstagramPublish,
  markBoardCompetitionSocialManual,
  retryBoardCompetitionSocialPublish,
  saveCompetitionSocialFields,
} from "../../_actions/social-publish-actions";
import type { BoardDetail } from "../../_lib/types";

export function isSocialPublishCard(title: string) {
  return title.trim() === SOCIAL_PUBLISH_CARD_TITLE;
}

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; caption: string; imageUrl: string | null }
  | { status: "error"; message: string; reason?: string };

type SaveStatus = "idle" | "saving" | "saved" | "error";


function checklistItem(ok: boolean, okLabel: string, missingLabel: string) {
  return {
    ok,
    label: ok ? okLabel : missingLabel,
  };
}

export function CardSocialPublishSection({
  board,
  cardId,
  readOnly,
  canManageSocialPublish = false,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
  canManageSocialPublish?: boolean;
}) {
  const router = useRouter();
  const competition = board.competition;
  const [customText, setCustomText] = React.useState(
    competition?.socialCustomText ?? "",
  );
  const [tags, setTags] = React.useState(competition?.socialTags ?? "");
  const [flyerUrl, setFlyerUrl] = React.useState(
    competition?.socialFlyerUrl ?? null,
  );
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = React.useState({
    customText: competition?.socialCustomText ?? "",
    tags: competition?.socialTags ?? "",
    flyerUrl: competition?.socialFlyerUrl ?? null,
  });
  const [preview, setPreview] = React.useState<PreviewState>({
    status: "idle",
  });
  const skipAutosaveRef = React.useRef(true);
  const saveGenerationRef = React.useRef(0);

  React.useEffect(() => {
    skipAutosaveRef.current = true;
    const next = {
      customText: competition?.socialCustomText ?? "",
      tags: competition?.socialTags ?? "",
      flyerUrl: competition?.socialFlyerUrl ?? null,
    };
    setCustomText(next.customText);
    setTags(next.tags);
    setFlyerUrl(next.flyerUrl);
    setLastSaved(next);
    setSaveStatus("idle");
  }, [
    competition?.socialCustomText,
    competition?.socialTags,
    competition?.socialFlyerUrl,
  ]);

  const persistFields = React.useCallback(
    async (next: {
      customText: string;
      tags: string;
      flyerUrl: string | null;
    }) => {
      if (!competition || readOnly) return;
      const generation = ++saveGenerationRef.current;
      setSaveStatus("saving");
      const result = await saveCompetitionSocialFields({
        boardId: board.id,
        cardId,
        customText: next.customText,
        tags: next.tags,
        flyerUrl: next.flyerUrl,
      });
      if (generation !== saveGenerationRef.current) return;
      if (result.ok) {
        setLastSaved(next);
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
        toast.error(result.message);
      }
    },
    [board.id, cardId, competition, readOnly],
  );

  const { startUpload, isUploading } = useUploadThing("socialFlyer", {
    onClientUploadComplete: (files) => {
      const url =
        files[0]?.serverData?.url ?? files[0]?.ufsUrl ?? files[0]?.url;
      if (!url) return;
      setFlyerUrl(url);
      toast.success("Flyer subido");
      void persistFields({ customText, tags, flyerUrl: url });
    },
    onUploadError: (error) => {
      toast.error(error.message || "Error al subir el flyer");
    },
  });

  const loadPreview = React.useCallback(
    (text: string, tagValue: string, flyer: string | null) => {
      if (!competition) {
        setPreview({ status: "idle" });
        return;
      }
      setPreview({ status: "loading" });
      void (async () => {
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
            | { ok: false; message: string; reason?: string };
          if (!data.ok) {
            setPreview({
              status: "error",
              message: data.message,
              reason: data.reason,
            });
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
      })();
    },
    [competition],
  );

  React.useEffect(() => {
    if (!competition) {
      setPreview({ status: "idle" });
      return;
    }
    const timer = window.setTimeout(() => {
      loadPreview(customText, tags, flyerUrl);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [competition, customText, tags, flyerUrl, loadPreview]);

  React.useEffect(() => {
    if (!competition || readOnly) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void persistFields({ customText, tags, flyerUrl });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [competition, readOnly, customText, tags, flyerUrl, persistFields]);

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

  const socialStatus = classifyCompetitionSocialStatus({
    statusPublic: competition.statusPublic,
    facebookPostId: competition.facebookPostId,
    instagramMediaId: competition.instagramMediaId,
    socialPublishedManually: competition.socialPublishedManually,
  });

  const readOnlyHint =
    socialStatus === "pending_announce"
      ? "Se publica al anunciar en el calendario."
      : socialStatus === "missing" || socialStatus === "fb_only"
        ? "Un delegado puede reintentar o completar la publicación desde aquí o en el calendario."
        : null;

  const savedWcaUrl = competition.wcaCompetitionUrl?.trim() || null;
  const hasCustomText = Boolean(lastSaved.customText.trim());
  const hasTags = Boolean(lastSaved.tags.trim());
  const hasFlyer = Boolean(lastSaved.flyerUrl?.trim());
  const checklist = [
    checklistItem(
      Boolean(savedWcaUrl),
      "URL WCA lista (tarjeta Sitio web)",
      "Falta URL WCA en la tarjeta Sitio web",
    ),
    checklistItem(
      hasCustomText,
      "Texto personalizado guardado",
      "Sin texto personalizado (se usará intro WCA)",
    ),
    checklistItem(
      hasTags,
      "Etiquetas guardadas",
      "Sin etiquetas (opcional)",
    ),
    checklistItem(
      hasFlyer,
      "Flyer guardado",
      "Sin flyer (se usará logo WCA si existe)",
    ),
  ];
  const readyForAnnounce = Boolean(savedWcaUrl);

  const saveLabel =
    saveStatus === "saving"
      ? "Guardando…"
      : saveStatus === "saved"
        ? "Guardado"
        : saveStatus === "error"
          ? "Error al guardar"
          : null;

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <CompetitionSocialStatusPanel
        className="border-0 bg-muted/20 p-3 shadow-none"
        status={socialStatus}
        facebookPostId={competition.facebookPostId}
        facebookUrl={facebookPostHref(competition.facebookPostId)}
        instagramMediaId={competition.instagramMediaId}
        announcedPostedAt={competition.announcedPostedAt}
        canRetry={canManageSocialPublish}
        readOnlyHint={!canManageSocialPublish ? readOnlyHint : null}
        onRetry={() => retryBoardCompetitionSocialPublish(board.id)}
        onCompleteInstagram={() =>
          completeBoardCompetitionInstagramPublish(board.id)
        }
        onMarkManual={() => markBoardCompetitionSocialManual(board.id)}
        onActionSuccess={() => router.refresh()}
      />

      <div className="space-y-2 rounded-md border bg-muted/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Listo para anunciar</h3>
          <span
            className={
              readyForAnnounce
                ? "text-xs font-medium text-emerald-800"
                : "text-xs font-medium text-amber-800"
            }
          >
            {readyForAnnounce
              ? "Listo (falta anunciar en calendario)"
              : "Falta URL WCA"}
          </span>
        </div>
        <p className="text-muted-foreground text-xs leading-5">
          El post se publica en Torneo de Rubik cuando un delegado anuncia la
          competencia en el calendario. Aquí solo se prepara el contenido.
        </p>
        <ul className="space-y-1 text-xs">
          {checklist.map((item) => (
            <li
              key={item.label}
              className={
                item.ok ? "text-foreground" : "text-muted-foreground"
              }
            >
              {item.ok ? "✓" : "·"} {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Preparar contenido</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Etiquetas y flyer para Torneo de Rubik. Fechas, sede, categorías y
          cupo salen de la WCA. El texto personalizado es opcional: si lo dejas
          vacío, se usa la introducción en español de la página WCA. Los cambios
          se guardan solos.
        </p>
        {saveLabel ? (
          <p
            className={
              saveStatus === "error"
                ? "mt-1 text-xs text-destructive"
                : "text-muted-foreground mt-1 text-xs"
            }
          >
            {saveLabel}
          </p>
        ) : null}
      </div>

      {savedWcaUrl ? (
        <div className="space-y-1">
          <p className="min-w-0 text-sm break-all">
            URL WCA:{" "}
            <a
              href={savedWcaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {savedWcaUrl}
            </a>
          </p>
          <p className="text-muted-foreground text-xs">
            Para cambiarla, usa la tarjeta Sitio web (WCA).
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Sin URL de la WCA todavía. Agrégala en la tarjeta Sitio web (WCA)
          antes de anunciar.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`social-text-${cardId}`}>
          Texto personalizado (opcional)
        </Label>
        <Textarea
          id={`social-text-${cardId}`}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={8}
          disabled={readOnly || isUploading}
          placeholder="Historia / copy creativo del anuncio… Si está vacío, se toma de la WCA."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`social-tags-${cardId}`}>
          Teams / cuentas a etiquetar
        </Label>
        <Input
          id={`social-tags-${cardId}`}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={readOnly || isUploading}
          placeholder="@team Nombre del Team"
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
              disabled={isUploading || saveStatus === "saving"}
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
                disabled={saveStatus === "saving"}
                onClick={() => {
                  setFlyerUrl(null);
                  void persistFields({
                    customText,
                    tags,
                    flyerUrl: null,
                  });
                }}
              >
                Quitar flyer
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {preview.status === "loading" ? (
        <p className="text-muted-foreground text-sm">Actualizando preview…</p>
      ) : null}
      {preview.status === "error" ? (
        preview.reason === "not_found" &&
        competition.statusPublic !== "announced" ? (
          <p className="text-muted-foreground text-sm">
            El preview aparecerá cuando la competencia sea pública en la WCA.
          </p>
        ) : preview.reason === "missing_url" ? null : (
          <p className="text-destructive text-sm">{preview.message}</p>
        )
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
