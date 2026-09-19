"use client";

import * as React from "react";
import { toast } from "sonner";

import { WCA_WEBSITE_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { saveCompetitionWcaUrl } from "../../_actions/wca-url-actions";
import type { BoardDetail } from "../../_lib/types";

export function isWcaWebsiteCard(title: string) {
  return title.trim() === WCA_WEBSITE_CARD_TITLE;
}

export function CardWcaUrlSection({
  board,
  cardId,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const competition = board.competition;
  const [url, setUrl] = React.useState(competition?.wcaCompetitionUrl ?? "");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setUrl(competition?.wcaCompetitionUrl ?? "");
  }, [competition?.wcaCompetitionUrl]);

  if (!competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">URL WCA</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia; no se puede guardar la
          URL de la WCA.
        </p>
      </section>
    );
  }

  const savedUrl = competition.wcaCompetitionUrl?.trim() || null;

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveCompetitionWcaUrl({
        boardId: board.id,
        cardId,
        wcaCompetitionUrl: url,
      });
      if (result.ok) {
        setUrl(result.wcaCompetitionUrl ?? "");
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">URL WCA</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Guarda el enlace público de la competencia en la WCA. Queda
          sincronizado con el calendario AMS y se usa al anunciar en redes.
        </p>
      </div>

      {savedUrl ? (
        <p className="text-sm">
          Actual:{" "}
          <a
            href={savedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            {savedUrl}
          </a>
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Sin URL guardada todavía
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`wca-url-${cardId}`}>URL de la competencia</Label>
        <Input
          id={`wca-url-${cardId}`}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={readOnly || pending}
          placeholder="https://www.worldcubeassociation.org/competitions/..."
        />
      </div>

      {!readOnly ? (
        <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      ) : null}
    </section>
  );
}
