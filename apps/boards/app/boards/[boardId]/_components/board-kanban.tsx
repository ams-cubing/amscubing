"use client";

import * as React from "react";

import { Badge } from "@workspace/ui/components/badge";
import {
  Kanban,
  KanbanBoard,
  KanbanOverlay,
} from "@workspace/ui/components/kanban";

import { runBoardAction } from "@/lib/run-board-action";

import { moveCardAction } from "../_actions/board-actions";
import {
  boardToColumns,
  cardKey,
  flattenCards,
  isCardRelevantNow,
  listKey,
  parseCardKey,
  parseListKey,
  type BoardDetail,
  type ColumnsState,
} from "../_lib/types";
import { CardDialog } from "./card-dialog";
import { KanbanCardFace } from "./kanban-card-face";
import { AddListForm, BoardKanbanColumn } from "./kanban-column";

function findCardColumn(columns: ColumnsState, cardId: string) {
  for (const [columnId, cardIds] of Object.entries(columns)) {
    if (cardIds.includes(cardId)) return columnId;
  }
  return null;
}

function cardPlacementChanged(
  previous: ColumnsState,
  next: ColumnsState,
  cardId: string,
) {
  const prevList = findCardColumn(previous, cardId);
  const nextList = findCardColumn(next, cardId);
  if (!prevList || !nextList) return false;
  if (prevList !== nextList) return true;
  return (
    previous[prevList]!.indexOf(cardId) !== next[nextList]!.indexOf(cardId)
  );
}

export function BoardKanban({
  board,
  readOnly = false,
  initialCardId = null,
}: {
  board: BoardDetail;
  readOnly?: boolean;
  initialCardId?: number | null;
}) {
  const [columns, setColumns] = React.useState<ColumnsState>(() =>
    boardToColumns(board),
  );
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    () => (initialCardId != null ? cardKey(initialCardId) : null),
  );
  function selectCard(cardId: string | null) {
    setSelectedCardId(cardId);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (cardId) {
      url.searchParams.set("card", String(parseCardKey(cardId)));
    } else {
      url.searchParams.delete("card");
    }
    window.history.replaceState(null, "", url);
  }
  const columnsRef = React.useRef(columns);
  const dragSnapshotRef = React.useRef<ColumnsState | null>(null);
  const activeDragIdRef = React.useRef<string | null>(null);
  const isDraggingRef = React.useRef(false);

  React.useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  React.useEffect(() => {
    if (isDraggingRef.current) return;
    const next = boardToColumns(board);
    columnsRef.current = next;
    setColumns(next);
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

  function commitDrag() {
    const previous = dragSnapshotRef.current;
    const activeId = activeDragIdRef.current;
    const next = columnsRef.current;

    dragSnapshotRef.current = null;
    activeDragIdRef.current = null;
    isDraggingRef.current = false;

    if (readOnly || !previous || !activeId) return;
    // Column drags use list keys; card persistence is only for cards.
    if (activeId in next) return;
    if (!cardPlacementChanged(previous, next, activeId)) return;

    void runBoardAction(() => persistMove(next, activeId), {
      errorMessage: "No se pudo mover la tarjeta",
      onError: () => {
        columnsRef.current = previous;
        setColumns(previous);
      },
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Kanban
        value={columns}
        onValueChange={(next) => {
          if (readOnly) return;
          columnsRef.current = next;
          setColumns(next);
        }}
        onDragStart={(event) => {
          if (readOnly) return;
          isDraggingRef.current = true;
          dragSnapshotRef.current = columnsRef.current;
          activeDragIdRef.current = String(event.active.id);
        }}
        onDragEnd={() => {
          // Kanban may still apply a same-column reorder via onValueChange
          // after this user handler runs — read the final board in a microtask.
          queueMicrotask(commitDrag);
        }}
        onDragCancel={() => {
          const previous = dragSnapshotRef.current;
          dragSnapshotRef.current = null;
          activeDragIdRef.current = null;
          isDraggingRef.current = false;
          if (previous) {
            columnsRef.current = previous;
            setColumns(previous);
          }
        }}
        getItemValue={(item) => item}
      >
        <KanbanBoard className="h-full min-h-0 items-start gap-3 overflow-x-auto overflow-y-hidden p-4">
          {Object.entries(columns).map(([columnId, cardIds]) => {
            const list = listsById.get(columnId);
            if (!list) return null;

            return (
              <BoardKanbanColumn
                key={columnId}
                value={columnId}
                title={list.title}
                cardIds={cardIds}
                cardsById={cardsById}
                board={board}
                readOnly={readOnly}
                onOpenCard={selectCard}
              />
            );
          })}
          {!readOnly && <AddListForm boardId={board.id} />}
        </KanbanBoard>
        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const cardIds = columns[String(value)] ?? [];
              const list = listsById.get(String(value));
              if (!list) return null;
              return (
                <div className="flex h-auto max-h-full w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/40">
                  <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {list.title}
                      </span>
                      <Badge
                        variant="secondary"
                        className="pointer-events-none rounded-sm"
                      >
                        {cardIds.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-0.5 px-2 pb-2">
                    {cardIds.map((id) => {
                      const card = cardsById.get(id);
                      if (!card) return null;
                      return (
                        <KanbanCardFace
                          key={id}
                          card={card}
                          relevant={isCardRelevantNow(
                            card,
                            board.competition?.statusPublic,
                            board.competition?.statusInternal,
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            }

            const card = cardsById.get(String(value));
            if (!card) return null;
            return (
              <KanbanCardFace
                card={card}
                relevant
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
          if (!open) selectCard(null);
        }}
        readOnly={readOnly}
      />
    </div>
  );
}
