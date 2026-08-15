"use client";

import { Plus } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import type { BoardCard } from "../../_lib/types";

export function CardChecklistsSection({
  card,
  checklistTitle,
  showChecklistForm,
  newItem,
  checklistInputRef,
  onChecklistTitleChange,
  onShowChecklistForm,
  onNewItemChange,
  onAddChecklist,
  onToggleItem,
  onAddItem,
}: {
  card: BoardCard;
  checklistTitle: string;
  showChecklistForm: boolean;
  newItem: Record<number, string>;
  checklistInputRef: React.RefObject<HTMLInputElement | null>;
  onChecklistTitleChange: (value: string) => void;
  onShowChecklistForm: (value: boolean) => void;
  onNewItemChange: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onAddChecklist: () => void;
  onToggleItem: (itemId: number, done: boolean) => void;
  onAddItem: (checklistId: number, value: string) => void;
}) {
  return (
    <div className="space-y-4">
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

      {card.checklists.map((checklist) => (
        <div key={checklist.id} className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">{checklist.title}</div>
          <ul className="space-y-2">
            {checklist.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <Checkbox
                  checked={item.done}
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
        </div>
      ))}
    </div>
  );
}
