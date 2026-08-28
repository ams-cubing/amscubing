"use client";

import { CheckSquare, Plus } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import type { BoardCard } from "../../_lib/types";

function checklistProgress(items: BoardCard["checklists"][number]["items"]) {
  const total = items.length;
  if (total === 0) return 0;
  const done = items.filter((item) => item.done).length;
  return Math.round((done / total) * 100);
}

export function CardChecklistsSection({
  card,
  checklistTitle,
  showChecklistForm,
  newItem,
  checklistInputRef,
  readOnly,
  onChecklistTitleChange,
  onShowChecklistForm,
  onNewItemChange,
  onAddChecklist,
  onToggleItem,
  onAddItem,
  onDeleteChecklist,
}: {
  card: BoardCard;
  checklistTitle: string;
  showChecklistForm: boolean;
  newItem: Record<number, string>;
  checklistInputRef: React.RefObject<HTMLInputElement | null>;
  readOnly?: boolean;
  onChecklistTitleChange: (value: string) => void;
  onShowChecklistForm: (value: boolean) => void;
  onNewItemChange: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onAddChecklist: () => void;
  onToggleItem: (itemId: number, done: boolean) => void;
  onAddItem: (checklistId: number, value: string) => void;
  onDeleteChecklist: (checklistId: number) => void;
}) {
  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between gap-2">
          <Label>Checklists</Label>
          {showChecklistForm ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onAddChecklist();
              }}
            >
              <Input
                ref={checklistInputRef}
                className="h-8 w-36"
                placeholder="Nueva checklist"
                value={checklistTitle}
                onChange={(e) => onChecklistTitleChange(e.target.value)}
              />
              <Button type="submit" size="sm" variant="outline">
                <Plus className="size-4" />
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onShowChecklistForm(true);
                requestAnimationFrame(() => checklistInputRef.current?.focus());
              }}
            >
              <Plus className="size-4" />
            </Button>
          )}
        </div>
      )}

      {card.checklists.map((checklist) => {
        const progress = checklistProgress(checklist.items);

        return (
          <div key={checklist.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
                <div className="text-sm font-medium">{checklist.title}</div>
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
                  onClick={() => onDeleteChecklist(checklist.id)}
                >
                  Eliminar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>

            <ul className="space-y-2">
              {checklist.items.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Checkbox
                    checked={item.done}
                    disabled={readOnly}
                    onCheckedChange={(checked) =>
                      onToggleItem(item.id, Boolean(checked))
                    }
                  />
                  <span
                    className={cn(
                      "text-sm",
                      item.done && "text-muted-foreground line-through",
                    )}
                  >
                    {item.title}
                  </span>
                </li>
              ))}
            </ul>

            {!readOnly && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = newItem[checklist.id]?.trim();
                  if (!value) return;
                  onAddItem(checklist.id, value);
                }}
              >
                <Input
                  className="h-8"
                  placeholder="Añadir ítem"
                  value={newItem[checklist.id] ?? ""}
                  onChange={(e) =>
                    onNewItemChange((prev) => ({
                      ...prev,
                      [checklist.id]: e.target.value,
                    }))
                  }
                />
                <Button type="submit" size="sm" variant="secondary">
                  Añadir
                </Button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
