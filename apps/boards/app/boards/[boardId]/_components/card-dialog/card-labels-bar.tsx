"use client";

import { Plus } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import type { BoardCard } from "../../_lib/types";

export function CardLabelsBar({
  card,
  readOnly,
  onOpenList,
  onOpenEdit,
}: {
  card: BoardCard;
  readOnly: boolean;
  onOpenList: () => void;
  onOpenEdit: (labelId: number) => void;
}) {
  if (card.cardLabels.length === 0 && readOnly) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Etiquetas</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {card.cardLabels.map((cl) => (
          <button
            key={cl.labelId}
            type="button"
            disabled={readOnly}
            className={cn(
              "inline-flex h-8 max-w-full items-center rounded-md px-3",
              "text-sm font-semibold text-white transition",
              !readOnly && "hover:brightness-110",
              readOnly && "cursor-default",
            )}
            style={{ backgroundColor: cl.label.color }}
            onClick={() => {
              if (readOnly) return;
              onOpenEdit(cl.labelId);
            }}
          >
            <span className="truncate">{cl.label.name}</span>
          </button>
        ))}
        {!readOnly && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 shrink-0"
            onClick={onOpenList}
            aria-label="Añadir etiqueta"
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
