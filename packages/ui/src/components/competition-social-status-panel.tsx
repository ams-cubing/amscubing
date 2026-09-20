"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";

import {
  competitionSocialCanCompleteInstagram,
  competitionSocialCanMarkManual,
  competitionSocialCanRetry,
  competitionSocialStatusClassName,
  competitionSocialStatusDescription,
  competitionSocialStatusLabel,
  type CompetitionSocialStatus,
} from "@workspace/social/status";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";

export type CompetitionSocialActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type CompetitionSocialStatusPanelProps = {
  status: CompetitionSocialStatus;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  instagramMediaId?: string | null;
  facebookPostId?: string | null;
  announcedPostedAt?: string | Date | null;
  canRetry?: boolean;
  readOnlyHint?: string | null;
  className?: string;
  onRetry?: () => Promise<CompetitionSocialActionResult>;
  onCompleteInstagram?: () => Promise<CompetitionSocialActionResult>;
  onMarkManual?: () => Promise<CompetitionSocialActionResult>;
  onActionSuccess?: () => void;
};

export function CompetitionSocialStatusPanel({
  status,
  facebookUrl,
  instagramUrl,
  instagramMediaId,
  facebookPostId,
  announcedPostedAt,
  canRetry = false,
  readOnlyHint,
  className,
  onRetry,
  onCompleteInstagram,
  onMarkManual,
  onActionSuccess,
}: CompetitionSocialStatusPanelProps) {
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [manualDialogOpen, setManualDialogOpen] = React.useState(false);

  const showRetry =
    canRetry && competitionSocialCanRetry(status) && Boolean(onRetry);
  const showCompleteIg =
    canRetry &&
    competitionSocialCanCompleteInstagram({
      facebookPostId,
      instagramMediaId,
    }) &&
    Boolean(onCompleteInstagram);
  const showMarkManual =
    canRetry && competitionSocialCanMarkManual(status) && Boolean(onMarkManual);

  const postedAtLabel = announcedPostedAt
    ? new Date(announcedPostedAt).toLocaleString("es-MX")
    : null;

  const runAction = (action: "retry" | "ig" | "manual") => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const runner =
        action === "retry"
          ? onRetry
          : action === "ig"
            ? onCompleteInstagram
            : onMarkManual;
      if (!runner) return;
      const result = await runner();
      if (result.ok) {
        setMessage(result.message);
        if (action === "manual") {
          setManualDialogOpen(false);
        }
        onActionSuccess?.();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Publicación en redes</h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                competitionSocialStatusClassName(status),
              )}
            >
              {competitionSocialStatusLabel(status)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {competitionSocialStatusDescription(status)}
          </p>
          {postedAtLabel ? (
            <p className="text-xs text-muted-foreground">
              Publicado: {postedAtLabel}
            </p>
          ) : null}
          {!canRetry && readOnlyHint ? (
            <p className="text-xs text-muted-foreground">{readOnlyHint}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {facebookUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Facebook
              </a>
            </Button>
          ) : null}
          {instagramUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Instagram
              </a>
            </Button>
          ) : instagramMediaId ? (
            <span className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
              IG id: {instagramMediaId}
            </span>
          ) : null}
        </div>
      </div>

      {showRetry || showCompleteIg || showMarkManual ? (
        <div className="flex flex-wrap gap-2">
          {showRetry ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => runAction("retry")}
            >
              {pending ? "Publicando…" : "Reintentar publicación"}
            </Button>
          ) : null}
          {showCompleteIg ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => runAction("ig")}
            >
              {pending ? "Publicando…" : "Completar Instagram"}
            </Button>
          ) : null}
          {showMarkManual ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setManualDialogOpen(true)}
            >
              Marcar como publicada manualmente
            </Button>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error && !manualDialogOpen ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : null}

      <Dialog
        open={manualDialogOpen}
        onOpenChange={(open) => {
          setManualDialogOpen(open);
          if (!open) setError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como publicada manualmente</DialogTitle>
            <DialogDescription>
              ¿Marcar esta competencia como publicada manualmente? No se enviará
              nada a Meta.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button disabled={pending} onClick={() => runAction("manual")}>
              {pending ? "Guardando…" : "Marcar como manual"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
