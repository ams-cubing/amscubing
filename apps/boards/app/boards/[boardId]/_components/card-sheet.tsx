"use client";

import { Paperclip, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import {
  addAttachmentAction,
  addChecklistAction,
  addChecklistItemAction,
  removeAttachmentAction,
  toggleCardLabelAction,
  toggleChecklistItemAction,
  updateCardAction,
} from "../_actions/board-actions";
import type { BoardCard, BoardDetail } from "../_lib/types";

export function CardSheet({
  board,
  card,
  open,
  onOpenChange,
}: {
  board: BoardDetail;
  card: BoardCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = React.useState(card?.title ?? "");
  const [description, setDescription] = React.useState(
    card?.description ?? "",
  );
  const [pending, startTransition] = React.useTransition();
  const [newItem, setNewItem] = React.useState<Record<number, string>>({});
  const [attachmentName, setAttachmentName] = React.useState("");
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const [checklistTitle, setChecklistTitle] = React.useState("");

  React.useEffect(() => {
    setTitle(card?.title ?? "");
    setDescription(card?.description ?? "");
    setNewItem({});
    setAttachmentName("");
    setAttachmentUrl("");
    setChecklistTitle("");
  }, [card]);

  if (!card) return null;

  const labelIds = new Set(card.cardLabels.map((cl) => cl.labelId));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="sr-only">{card.title}</SheetTitle>
          <SheetDescription className="sr-only">
            Detalle de la tarjeta
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-6 px-1 pb-8">
          <div className="space-y-2">
            <Label htmlFor="card-title">Título</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title.trim() && title !== card.title) {
                  startTransition(async () => {
                    await updateCardAction({
                      boardId: board.id,
                      cardId: card.id,
                      title: title.trim(),
                    });
                  });
                }
              }}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-2">
              {board.labels.map((label) => {
                const checked = labelIds.has(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium text-white transition",
                      checked ? "ring-2 ring-offset-2 ring-offset-background" : "opacity-60",
                    )}
                    style={{ backgroundColor: label.color }}
                    onClick={() => {
                      startTransition(async () => {
                        await toggleCardLabelAction({
                          boardId: board.id,
                          cardId: card.id,
                          labelId: label.id,
                          checked: !checked,
                        });
                      });
                    }}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-description">Descripción</Label>
            <Textarea
              id="card-description"
              value={description}
              rows={5}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                const next = description.trim() || null;
                if (next !== (card.description ?? null)) {
                  startTransition(async () => {
                    await updateCardAction({
                      boardId: board.id,
                      cardId: card.id,
                      description: next,
                    });
                  });
                }
              }}
              disabled={pending}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Checklists</Label>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    await addChecklistAction({
                      boardId: board.id,
                      cardId: card.id,
                      title: checklistTitle || "Checklist",
                    });
                    setChecklistTitle("");
                  });
                }}
              >
                <Input
                  className="h-8 w-36"
                  placeholder="Nueva checklist"
                  value={checklistTitle}
                  onChange={(e) => setChecklistTitle(e.target.value)}
                />
                <Button type="submit" size="sm" variant="outline">
                  <Plus className="size-4" />
                </Button>
              </form>
            </div>

            {card.checklists.map((checklist) => (
              <div key={checklist.id} className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-medium">{checklist.title}</div>
                <ul className="space-y-2">
                  {checklist.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={(checked) => {
                          startTransition(async () => {
                            await toggleChecklistItemAction({
                              boardId: board.id,
                              itemId: item.id,
                              done: Boolean(checked),
                            });
                          });
                        }}
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
                    startTransition(async () => {
                      await addChecklistItemAction({
                        boardId: board.id,
                        checklistId: checklist.id,
                        title: value,
                      });
                      setNewItem((prev) => ({ ...prev, [checklist.id]: "" }));
                    });
                  }}
                >
                  <Input
                    className="h-8"
                    placeholder="Añadir ítem"
                    value={newItem[checklist.id] ?? ""}
                    onChange={(e) =>
                      setNewItem((prev) => ({
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

          <div className="space-y-3">
            <Label className="inline-flex items-center gap-2">
              <Paperclip className="size-4" />
              Adjuntos (URL)
            </Label>
            <ul className="space-y-2">
              {card.attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate underline-offset-2 hover:underline"
                  >
                    {attachment.name}
                  </a>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      startTransition(async () => {
                        await removeAttachmentAction({
                          boardId: board.id,
                          attachmentId: attachment.id,
                        });
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!attachmentUrl.trim()) return;
                startTransition(async () => {
                  await addAttachmentAction({
                    boardId: board.id,
                    cardId: card.id,
                    name: attachmentName,
                    url: attachmentUrl,
                  });
                  setAttachmentName("");
                  setAttachmentUrl("");
                });
              }}
            >
              <Input
                placeholder="Nombre"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
              />
              <Input
                placeholder="https://..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                required
              />
              <Button type="submit" size="sm" disabled={pending}>
                Añadir adjunto
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
