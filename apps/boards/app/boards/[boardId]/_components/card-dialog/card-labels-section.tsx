"use client";

import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import type { BoardDetail } from "../../_lib/types";

export function CardLabelsSection({
  board,
  labelIds,
  readOnly,
  pending,
  onToggle,
}: {
  board: BoardDetail;
  labelIds: Set<number>;
  readOnly: boolean;
  pending: boolean;
  onToggle: (labelId: number, checked: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Etiquetas</Label>
      <div className="flex flex-wrap gap-2">
        {board.labels.map((label) => {
          const checked = labelIds.has(label.id);
          return (
            <button
              key={label.id}
              type="button"
              disabled={readOnly || pending}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium text-white transition",
                checked
                  ? "ring-2 ring-offset-2 ring-offset-background"
                  : "opacity-60",
                readOnly && "cursor-default",
              )}
              style={{ backgroundColor: label.color }}
              onClick={() => {
                if (readOnly) return;
                onToggle(label.id, !checked);
              }}
            >
              {label.name}
            </button>
          );
        })}
        {board.labels.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin etiquetas</p>
        )}
      </div>
    </div>
  );
}
