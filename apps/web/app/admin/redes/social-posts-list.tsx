"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";

import { Button } from "@workspace/ui/components/button";

import {
  completeInstagramPublish,
  markAsManuallyPublished,
  retrySocialPublish,
} from "@/app/admin/redes/actions";

export type SocialPostRow = {
  id: number;
  name: string | null;
  city: string;
  startDate: string;
  endDate: string;
  isPast: boolean;
  wcaCompetitionUrl: string | null;
  announcedPostedAt: string | null;
  facebookPostId: string | null;
  facebookUrl: string | null;
  instagramMediaId: string | null;
  instagramUrl: string | null;
  status: "fb_ig" | "fb_only" | "manual" | "missing";
  preview:
    | {
        ok: true;
        displayName: string;
        wcaUrl: string;
        logoUrl: string | null;
        imageUrl: string | null;
        flyerUrl: string | null;
        caption: string;
      }
    | { ok: false; message: string }
    | null;
};

function statusLabel(status: SocialPostRow["status"]) {
  switch (status) {
    case "fb_ig":
      return "FB + IG";
    case "fb_only":
      return "Solo FB";
    case "manual":
      return "Manual";
    case "missing":
      return "Sin publicar";
  }
}

function statusClass(status: SocialPostRow["status"]) {
  switch (status) {
    case "fb_ig":
      return "bg-emerald-100 text-emerald-900";
    case "fb_only":
      return "bg-amber-100 text-amber-900";
    case "manual":
      return "bg-sky-100 text-sky-900";
    case "missing":
      return "bg-rose-100 text-rose-900";
  }
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function SocialPostCard({ row }: { row: SocialPostRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const title =
    row.preview && row.preview.ok
      ? row.preview.displayName
      : (row.name ?? `Competencia en ${row.city}`);

  const dateLabel =
    row.startDate === row.endDate
      ? formatDate(row.startDate)
      : `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`;

  const canRetry = row.status === "missing";
  const canCompleteIg = Boolean(row.facebookPostId) && !row.instagramMediaId;
  const canMarkManual = row.status === "missing";

  const runAction = (action: "retry" | "ig" | "manual") => {
    if (action === "manual") {
      const confirmed = window.confirm(
        "¿Marcar como publicada manualmente? No se enviará nada a Meta.",
      );
      if (!confirmed) return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result =
        action === "retry"
          ? await retrySocialPublish(row.id)
          : action === "ig"
            ? await completeInstagramPublish(row.id)
            : await markAsManuallyPublished(row.id);
      if (result.ok) {
        setMessage(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <li className="rounded-4.5 bg-white p-5 shadow-[0_10px_24px_rgba(1,11,25,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="ams-display text-xl leading-none text-ams-navy">
              {title}
            </h4>
            <span
              className={`ams-heading rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}
            >
              {statusLabel(row.status)}
            </span>
            {row.isPast ? (
              <span className="ams-heading rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-black/55">
                Pasada
              </span>
            ) : null}
          </div>
          <p className="ams-copy text-sm text-black/60">
            {row.city} · {dateLabel}
          </p>
          {row.announcedPostedAt ? (
            <p className="ams-copy text-xs text-black/45">
              Publicado:{" "}
              {new Date(row.announcedPostedAt).toLocaleString("es-MX")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {row.wcaCompetitionUrl ? (
            <a
              href={row.wcaCompetitionUrl}
              target="_blank"
              rel="noreferrer"
              className="ams-heading rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-ams-navy hover:bg-ams-soft"
            >
              WCA
            </a>
          ) : null}
          {row.facebookUrl ? (
            <a
              href={row.facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="ams-heading rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-ams-navy hover:bg-ams-soft"
            >
              Facebook
            </a>
          ) : null}
          {row.instagramUrl ? (
            <a
              href={row.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="ams-heading rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-ams-navy hover:bg-ams-soft"
            >
              Instagram
            </a>
          ) : row.instagramMediaId ? (
            <span className="ams-copy rounded-full border border-black/10 px-3 py-1.5 text-xs text-black/50">
              IG id: {row.instagramMediaId}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen((open) => !open)}
        >
          {previewOpen ? "Ocultar preview" : "Ver preview"}
        </Button>
        {canRetry ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => runAction("retry")}
          >
            {pending ? "Publicando…" : "Reintentar publicación"}
          </Button>
        ) : null}
        {canCompleteIg ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => runAction("ig")}
          >
            {pending ? "Publicando…" : "Completar Instagram"}
          </Button>
        ) : null}
        {canMarkManual ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => runAction("manual")}
          >
            {pending ? "Guardando…" : "Marcar como publicada manualmente"}
          </Button>
        ) : null}
      </div>

      {message ? (
        <p className="ams-copy mt-3 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="ams-copy mt-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {previewOpen ? (
        <div className="mt-4 space-y-3 rounded-3.5 border border-black/8 bg-ams-soft/60 p-4">
          {!row.preview ? (
            <p className="ams-copy text-sm text-black/55">
              Sin URL WCA: no hay preview disponible.
            </p>
          ) : !row.preview.ok ? (
            <p className="ams-copy text-sm text-rose-700">
              {row.preview.message}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-4">
                {row.preview.imageUrl ? (
                  <div className="space-y-1">
                    <div className="relative h-24 w-24 overflow-hidden rounded-2.5 bg-white">
                      <Image
                        src={row.preview.imageUrl}
                        alt={`Imagen ${row.preview.displayName}`}
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                    </div>
                    <p className="text-center text-[11px] text-black/45">
                      {row.preview.flyerUrl ? "Flyer" : "Logo WCA"}
                    </p>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2.5 bg-white text-center text-xs text-black/45">
                    Sin imagen
                  </div>
                )}
                <pre className="ams-copy max-w-xl flex-1 whitespace-pre-wrap text-sm leading-6 text-black/75">
                  {row.preview.caption}
                </pre>
              </div>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function SocialPostsList({ rows }: { rows: SocialPostRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="ams-copy text-sm text-black/60">
        No hay competencias anunciadas todavía.
      </p>
    );
  }

  return (
    <ul className="space-y-6">
      {rows.map((row) => (
        <SocialPostCard key={row.id} row={row} />
      ))}
    </ul>
  );
}
