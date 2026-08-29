"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import { HECHO_LIST_TITLE, isListTitle } from "@workspace/db/board-readiness";
import {
  formatNotificationTitle,
  hrefForNotification,
  insertNotifications,
  isCompetitionOrganizer,
} from "@workspace/db/notifications";
import { boardLists, boards, cardMembers, cards } from "@workspace/db/schema";

import {
  maybeNotifyReadinessSuggestion,
  notifyHechoReview,
} from "@/lib/board-notifications";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";
import { createCardSchema } from "@/app/_lib/validations";

import {
  assertUserAssignableToBoard,
  requireBoardAccess,
} from "../_lib/board-access";

export async function moveCardAction(input: {
  boardId: number;
  cardId: number;
  toListId: number;
  toPosition: number;
  orderedCardIdsInTargetList: number[];
}) {
  const actor = await requireBoardAccess(input.boardId);

  const card = await db.query.cards.findFirst({
    where: eq(cards.id, input.cardId),
    columns: { id: true, title: true, listId: true },
    with: {
      list: { columns: { title: true } },
    },
  });
  if (!card) throw new Error("Tarjeta no encontrada");

  const list = await db.query.boardLists.findFirst({
    where: and(
      eq(boardLists.id, input.toListId),
      eq(boardLists.boardId, input.boardId),
    ),
  });
  if (!list) throw new Error("Lista no encontrada");

  const fromListTitle = card.list?.title ?? "";
  const toListTitle = list.title;
  const movedIntoHecho =
    !isListTitle(fromListTitle, HECHO_LIST_TITLE) &&
    isListTitle(toListTitle, HECHO_LIST_TITLE);

  await db
    .update(cards)
    .set({ listId: input.toListId, position: input.toPosition })
    .where(eq(cards.id, input.cardId));

  await Promise.all(
    input.orderedCardIdsInTargetList.map((id, position) =>
      db
        .update(cards)
        .set({ listId: input.toListId, position })
        .where(eq(cards.id, id)),
    ),
  );

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, input.boardId),
    columns: { competitionId: true, name: true },
    with: {
      competition: {
        columns: { id: true, city: true },
      },
    },
  });

  const urls = {
    calendarUrl: getCalendarUrl(),
    boardsUrl: getBoardsUrl(),
  };

  if (
    movedIntoHecho &&
    board?.competitionId &&
    board.competition &&
    (await isCompetitionOrganizer(db, board.competitionId, actor.wcaId))
  ) {
    await notifyHechoReview({
      boardId: input.boardId,
      cardId: input.cardId,
      cardTitle: card.title,
      city: board.competition.city,
      competitionId: board.competitionId,
      actor: { id: actor.id, name: actor.name },
      urls,
    });
  }

  if (board?.competitionId) {
    await maybeNotifyReadinessSuggestion(input.boardId, actor.id, urls);
  }

  revalidatePath(`/boards/${input.boardId}`);
}

export async function updateCardAction(input: {
  boardId: number;
  cardId: number;
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}) {
  await requireBoardAccess(input.boardId);

  await db
    .update(cards)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.dueDate !== undefined
        ? {
            dueDate:
              input.dueDate === null || input.dueDate === ""
                ? null
                : new Date(`${input.dueDate}T12:00:00`),
          }
        : {}),
    })
    .where(eq(cards.id, input.cardId));

  revalidatePath(`/boards/${input.boardId}`);
}

export async function toggleCardMemberAction(input: {
  boardId: number;
  cardId: number;
  userId: string;
  checked: boolean;
}) {
  const actor = await requireBoardAccess(input.boardId);

  if (input.checked) {
    await assertUserAssignableToBoard(input.boardId, input.userId);
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(cardMembers)
        .values({ cardId: input.cardId, userId: input.userId })
        .onConflictDoNothing()
        .returning();

      if (!inserted) return;

      const card = await tx.query.cards.findFirst({
        where: eq(cards.id, input.cardId),
        columns: { title: true },
      });
      const board = await tx.query.boards.findFirst({
        where: eq(boards.id, input.boardId),
        columns: { name: true },
      });

      await insertNotifications(tx, [
        {
          recipientId: input.userId,
          actorId: actor.id,
          type: "card_assigned",
          title: formatNotificationTitle("card_assigned", {
            cardTitle: card?.title,
          }),
          href: hrefForNotification("card_assigned", {
            urls: {
              calendarUrl: getCalendarUrl(),
              boardsUrl: getBoardsUrl(),
            },
            recipientRole: "user",
            boardId: input.boardId,
            cardId: input.cardId,
          }),
          payload: {
            boardId: input.boardId,
            boardName: board?.name,
            cardId: input.cardId,
            cardTitle: card?.title,
            actorName: actor.name,
          },
        },
      ]);
    });
  } else {
    await db
      .delete(cardMembers)
      .where(
        and(
          eq(cardMembers.cardId, input.cardId),
          eq(cardMembers.userId, input.userId),
        ),
      );
  }

  revalidatePath(`/boards/${input.boardId}`);
}

export async function createCardAction(input: {
  boardId: number;
  listId: number;
  title: string;
}) {
  const validated = createCardSchema.parse(input);
  await requireBoardAccess(validated.boardId);

  const list = await db.query.boardLists.findFirst({
    where: and(
      eq(boardLists.id, validated.listId),
      eq(boardLists.boardId, validated.boardId),
    ),
  });
  if (!list) throw new Error("Lista no encontrada");

  const existing = await db.query.cards.findMany({
    where: eq(cards.listId, validated.listId),
    columns: { position: true },
  });
  const nextPosition =
    existing.reduce((max, card) => Math.max(max, card.position), -1) + 1;

  await db.insert(cards).values({
    listId: validated.listId,
    title: validated.title,
    position: nextPosition,
  });

  revalidatePath(`/boards/${validated.boardId}`);
}

export async function createListAction(input: {
  boardId: number;
  title: string;
}) {
  await requireBoardAccess(input.boardId);

  const title = input.title.trim();
  if (!title) throw new Error("El título de la lista es obligatorio");

  const existing = await db.query.boardLists.findMany({
    where: eq(boardLists.boardId, input.boardId),
    columns: { position: true },
  });
  const nextPosition =
    existing.reduce((max, list) => Math.max(max, list.position), -1) + 1;

  await db.insert(boardLists).values({
    boardId: input.boardId,
    title,
    position: nextPosition,
  });

  revalidatePath(`/boards/${input.boardId}`);
}
