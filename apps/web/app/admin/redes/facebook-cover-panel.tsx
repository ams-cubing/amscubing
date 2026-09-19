"use client";

import { useState, useTransition } from "react";

import { Button } from "@workspace/ui/components/button";

import {
  previewFacebookCover,
  refreshFacebookCover,
} from "@/app/admin/redes/actions";

export function FacebookCoverPanel() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [slotCount, setSlotCount] = useState<number | null>(null);

  function runPreview() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await previewFacebookCover();
      if (!result.ok) {
        setError(result.message);
        setPreviewUrl(null);
        setSlotCount(null);
        return;
      }
      setPreviewUrl(result.dataUrl);
      setSlotCount(result.slotCount);
      setMessage(
        result.slotCount === 0
          ? "Vista previa lista (sin competencias anunciadas)."
          : `Vista previa con ${result.slotCount} competencia${result.slotCount === 1 ? "" : "s"}.`,
      );
    });
  }

  function runRefresh(force = false) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await refreshFacebookCover({ force });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
    });
  }

  return (
    <section className="space-y-6 rounded-5.5 bg-ams-soft p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="ams-display text-2xl leading-none text-ams-navy">
            Portada de Facebook
          </h3>
          <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
            Genera la portada de Torneo de Rubik con hasta 9 competencias
            anunciadas (logo, ciudad, fechas y registro). Sin badges de estado
            ni cupo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={runPreview}
          >
            Vista previa
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => runRefresh(true)}
          >
            Actualizar portada
          </Button>
        </div>
      </div>

      {message ? (
        <p className="text-sm text-emerald-800" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      {previewUrl ? (
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
          <img
            src={previewUrl}
            alt={
              slotCount != null
                ? `Vista previa de portada (${slotCount} competencias)`
                : "Vista previa de portada"
            }
            width={1640}
            height={924}
            className="h-auto w-full"
          />
        </div>
      ) : null}
    </section>
  );
}
