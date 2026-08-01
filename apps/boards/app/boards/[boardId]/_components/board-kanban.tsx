"use client";

import {
  AlignLeft,
  CalendarClock,
  CheckSquare,
  Paperclip,
  Plus,
} from "lucide-react";
import * as React from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { AvatarGroup } from "@workspace/ui/components/avatar-group";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanOverlay,
} from "@workspace/ui/components/kanban";
import { cn } from "@workspace/ui/lib/utils";

import { createCardAction, moveCardAction } from "../_actions/board-actions";
import {
  boardToColumns,
  flattenCards,
  isCardRelevantNow,
  listKey,
  parseCardKey,
  parseListKey,
  type BoardCard,
  type BoardDetail,
  type ColumnsState,
} from "../_lib/types";
import { CardDialog, formatDueDate } from "./card-dialog";

export function BoardKanban({ board }: { board: BoardDetail }) {
  const [columns, setColumns] = React.useState<ColumnsState>(() =>
    boardToColumns(board),
  );
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    setColumns(boardToColumns(board));
  }, [board]);

  const cardsById = React.useMemo(() => flattenCards(board), [board]);
  const listsById = React.useMemo(
    () => new Map(board.lists.map((list) => [listKey(list.id), list])),
    [board.lists],
  );

  const selectedCard = selectedCardId
    ? (cardsById.get(selectedCardId) ?? null)
    : null;

  async function persistMove(next: ColumnsState, activeCardId: string) {
    let toListId: number | null = null;
    let ordered: number[] = [];

    for (const [columnId, cardIds] of Object.entries(next)) {
      if (cardIds.includes(activeCardId)) {
        toListId = parseListKey(columnId);
        ordered = cardIds.map(parseCardKey);
        break;
      }
    }

    if (toListId == null) return;

    const cardId = parseCardKey(activeCardId);
    const toPosition = ordered.indexOf(cardId);
    await moveCardAction({
      boardId: board.id,
      cardId,
      toListId,
      toPosition,
      orderedCardIdsInTargetList: ordered,
    });
  }

  return (
    <>
      <Kanban
        value={columns}
        onValueChange={(next) => {
          const previous = columns;
          setColumns(next);

          const moved = Object.values(next)
            .flat()
            .find((id) => {
              const prevList = Object.entries(previous).find(([, ids]) =>
                ids.includes(id),
              )?.[0];
              const nextList = Object.entries(next).find(([, ids]) =>
                ids.includes(id),
              )?.[0];
              if (prevList !== nextList) return true;
              if (!prevList || !nextList) return false;
              return (
                previous[prevList]!.indexOf(id) !== next[nextList]!.indexOf(id)
              );
            });

          if (moved) {
            void persistMove(next, moved).catch(() => {
              setColumns(previous);
            });
          }
        }}
        getItemValue={(item) => item}
      >
        <KanbanBoard className="flex h-full min-h-[calc(100svh-8rem)] gap-3 overflow-x-auto p-4">
          {board.lists.map((list) => {
            const columnId = listKey(list.id);
            const cardIds = columns[columnId] ?? [];

            return (
              <KanbanColumn
                key={list.id}
                value={columnId}
                className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <h2 className="text-sm font-semibold">{list.title}</h2>
                  <Badge variant="secondary">{cardIds.length}</Badge>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                  {cardIds.map((id) => {
                    const card = cardsById.get(id);
                    if (!card) return null;
                    return (
                      <KanbanItem key={id} value={id} asHandle>
                        <CardFace
                          card={card}
                          relevant={isCardRelevantNow(
                            card,
                            board.competition?.statusPublic,
                            board.competition?.statusInternal,
                          )}
                          onOpen={() => setSelectedCardId(id)}
                        />
                      </KanbanItem>
                    );
                  })}
                  <AddCardForm
                    boardId={board.id}
                    listId={list.id}
                    listTitle={listsById.get(columnId)?.title ?? list.title}
                  />
                </div>
              </KanbanColumn>
            );
          })}
        </KanbanBoard>
        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") return null;
            const card = cardsById.get(String(value));
            if (!card) return null;
            return (
              <CardFace
                card={card}
                relevant
                onOpen={() => undefined}
                className="cursor-grabbing shadow-lg"
              />
            );
          }}
        </KanbanOverlay>
      </Kanban>

      <CardDialog
        board={board}
        card={selectedCard}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null);
        }}
      />
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function CardFace({
  card,
  relevant,
  onOpen,
  className,
}: {
  card: BoardCard;
  relevant: boolean;
  onOpen: () => void;
  className?: string;
}) {
  const checklistTotal = card.checklists.reduce(
    (sum, checklist) => sum + checklist.items.length,
    0,
  );
  const checklistDone = card.checklists.reduce(
    (sum, checklist) =>
      sum + checklist.items.filter((item) => item.done).length,
    0,
  );
  const hasDescription = Boolean(card.description?.trim());
  const attachmentCount = card.attachments.length;
  const hasDueDate = Boolean(card.dueDate);
  const hasMembers = card.members.length > 0;
  const hasMeta =
    hasDescription ||
    checklistTotal > 0 ||
    attachmentCount > 0 ||
    hasDueDate ||
    hasMembers;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-md border bg-background p-2.5 text-left shadow-sm transition hover:border-foreground/20",
        !relevant && "opacity-50",
        className,
      )}
    >
      {card.cardLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.cardLabels.map((cl) => (
            <span
              key={cl.labelId}
              className="h-1.5 w-10 rounded-full"
              style={{ backgroundColor: cl.label.color }}
              title={cl.label.name}
            />
          ))}
        </div>
      )}
      <div className="text-sm font-medium leading-snug">{card.title}</div>
      {hasMeta && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {hasDescription && <AlignLeft className="size-3.5" />}
          {hasDueDate && card.dueDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" />
              {formatDueDate(card.dueDate)}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="size-3.5" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3.5" />
              {attachmentCount}
            </span>
          )}
          {hasMembers && (
            <AvatarGroup size={18} className="ml-auto">
              {card.members.map((member) => (
                <Avatar key={member.userId} title={member.user.name}>
                  <AvatarImage
                    src={member.user.image || undefined}
                    alt={member.user.name}
                  />
                  <AvatarFallback className="text-[8px]">
                    {initials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
          )}
        </div>
      )}
    </button>
  );
}

function AddCardForm({
  boardId,
  listId,
  listTitle,
}: {
  boardId: number;
  listId: number;
  listTitle: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  if (listTitle === "Recursos" && !open) {
    // still allow adding, just keep compact
  }

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
          await createCardAction({ boardId, listId, title });
          setTitle("");
          setOpen(false);
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
