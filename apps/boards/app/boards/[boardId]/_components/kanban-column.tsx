"use client";

import { GripVertical, Plus } from "lucide-react";
import * as React from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
} from "@workspace/ui/components/kanban";
import { cn } from "@workspace/ui/lib/utils";

import { runBoardAction } from "@/lib/run-board-action";

import { createCardAction, createListAction } from "../_actions/board-actions";
import {
  cardKey,
  isCardRelevantNow,
  parseListKey,
  type BoardCard,
  type BoardDetail,
} from "../_lib/types";
import { KanbanCardFace } from "./kanban-card-face";

interface BoardColumnProps extends Omit<
  React.ComponentProps<typeof KanbanColumn>,
  "children"
> {
  title: string;
  cardIds: string[];
  cardsById: Map<string, BoardCard>;
  board: BoardDetail;
  readOnly?: boolean;
  onOpenCard: (cardId: string) => void;
}

export function BoardKanbanColumn({
  value,
  title,
  cardIds,
  cardsById,
  board,
  readOnly = false,
  onOpenCard,
  className,
  ...props
}: BoardColumnProps) {
  return (
    <KanbanColumn
      value={value}
      disabled={readOnly}
      className={cn(
        "flex h-auto max-h-full w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/40 p-0",
        className,
      )}
      {...props}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="secondary" className="pointer-events-none rounded-sm">
            {cardIds.length}
          </Badge>
        </div>
        {!readOnly && (
          <KanbanColumnHandle asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={`Mover lista ${title}`}
            >
              <GripVertical className="size-4" />
            </Button>
          </KanbanColumnHandle>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-0.5 px-2">
        {cardIds.map((id) => {
          const card = cardsById.get(id);
          if (!card) return null;
          return (
            <KanbanItem
              key={id}
              value={cardKey(card.id)}
              asHandle={!readOnly}
              asChild
            >
              <KanbanCardFace
                card={card}
                relevant={isCardRelevantNow(
                  card,
                  board.competition?.statusPublic,
                  board.competition?.statusInternal,
                )}
                onOpen={() => onOpenCard(id)}
              />
            </KanbanItem>
          );
        })}
      </div>
      {!readOnly && (
        <div className="shrink-0 px-2 pb-2 pt-1">
          <AddCardForm
            boardId={board.id}
            listId={parseListKey(String(value))}
          />
        </div>
      )}
    </KanbanColumn>
  );
}

function AddCardForm({ boardId, listId }: { boardId: number; listId: number }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Añadir tarjeta
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-md border bg-background p-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const result = await runBoardAction(
            () => createCardAction({ boardId, listId, title }),
            { errorMessage: "No se pudo crear la tarjeta" },
          );
          if (result !== undefined) {
            setTitle("");
            setOpen(false);
          }
        });
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la tarjeta"
        disabled={pending}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !title.trim()}>
          Añadir
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function AddListForm({ boardId }: { boardId: number }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="h-fit w-72 shrink-0 justify-start bg-muted/60 text-muted-foreground hover:bg-muted"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Añadir otra lista
      </Button>
    );
  }

  return (
    <form
      className="flex h-fit w-72 shrink-0 flex-col gap-2 rounded-lg border bg-muted/40 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const result = await runBoardAction(
            () => createListAction({ boardId, title }),
            { errorMessage: "No se pudo crear la lista" },
          );
          if (result !== undefined) {
            setTitle("");
            setOpen(false);
          }
        });
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la lista"
        disabled={pending}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !title.trim()}>
          Añadir lista
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
