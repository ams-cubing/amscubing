"use client";

import Link from "next/link";
import * as React from "react";
import { AlertTriangle } from "lucide-react";

import type { ReadinessSuggestion } from "@workspace/db/board-readiness";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { runBoardAction } from "@/lib/run-board-action";

import { applyReadinessSuggestionAction } from "../_actions/readiness-actions";

export function BoardReadinessBanner({
  boardId,
  suggestion,
  competitionHref,
  isDelegate,
}: {
  boardId: number;
  suggestion: ReadinessSuggestion;
  competitionHref: string | null;
  isDelegate: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const canApply =
    isDelegate &&
    suggestion.readyToApply &&
    suggestion.kindLabel === "apply_status";

  function applySuggestion() {
    startTransition(async () => {
      await runBoardAction(
        () =>
          applyReadinessSuggestionAction({
            boardId,
            kind: suggestion.kind,
          }),
        {
          successMessage: `Estatus actualizado: ${suggestion.label}`,
          errorMessage: "No se pudo aplicar la sugerencia",
          onSuccess: () => setConfirmOpen(false),
        },
      );
    });
  }

  return (
    <>
      <div className="shrink-0 border-b bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="min-w-0 space-y-1">
              <p className="font-medium">{suggestion.label}</p>
              <p className="text-muted-foreground">{suggestion.description}</p>
              <p className="text-xs text-muted-foreground">
                Progreso: {suggestion.progress.approved}/
                {suggestion.progress.total} tarjetas aprobadas
                {suggestion.missingCards.length > 0
                  ? ` · faltan ${suggestion.missingCards.length}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {suggestion.kindLabel === "announce_ready" && competitionHref ? (
              <Button asChild size="sm" variant="default">
                <Link href={competitionHref}>Ir a anunciar</Link>
              </Button>
            ) : null}
            {canApply ? (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => setConfirmOpen(true)}
              >
                Aplicar estatus
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Actualizar estatus?</DialogTitle>
            <DialogDescription>
              ¿Actualizar el estatus de la competencia a «{suggestion.label}»?
              Esta acción requiere confirmación y notificará al equipo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button disabled={pending} onClick={applySuggestion}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
