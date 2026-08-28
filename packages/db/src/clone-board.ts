import { and, eq } from "drizzle-orm";

import { TEMPLATE_BOARD_NAME } from "./data/ams-board-template";
import { db } from "./index";
import {
  boardLists,
  boards,
  cardAttachments,
  cardLabels,
  cards,
  checklistItems,
  checklists,
  competitions,
  labels,
} from "./schema";

function must<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Expected ${label} from database insert`);
  }
  return value;
}

export async function getTemplateBoard() {
  const named = await db.query.boards.findFirst({
    where: and(
      eq(boards.isTemplate, true),
      eq(boards.name, TEMPLATE_BOARD_NAME),
    ),
    with: {
      lists: {
        orderBy: (list, { asc }) => [asc(list.position)],
        with: {
          cards: {
            orderBy: (card, { asc }) => [asc(card.position)],
            with: {
              cardLabels: true,
              checklists: {
                orderBy: (checklist, { asc }) => [asc(checklist.position)],
                with: {
                  items: {
                    orderBy: (item, { asc }) => [asc(item.position)],
                  },
                },
              },
              attachments: true,
            },
          },
        },
      },
      labels: true,
    },
  });

  if (named) return named;

  return db.query.boards.findFirst({
    where: eq(boards.isTemplate, true),
    with: {
      lists: {
        orderBy: (list, { asc }) => [asc(list.position)],
        with: {
          cards: {
            orderBy: (card, { asc }) => [asc(card.position)],
            with: {
              cardLabels: true,
              checklists: {
                orderBy: (checklist, { asc }) => [asc(checklist.position)],
                with: {
                  items: {
                    orderBy: (item, { asc }) => [asc(item.position)],
                  },
                },
              },
              attachments: true,
            },
          },
        },
      },
      labels: true,
    },
  });
}

export async function cloneBoardFromTemplate(input: {
  competitionId: number;
  boardName: string;
}) {
  const existing = await db.query.boards.findFirst({
    where: eq(boards.competitionId, input.competitionId),
  });

  if (existing) {
    return existing;
  }

  const template = await getTemplateBoard();
  if (!template) {
    throw new Error(
      "AMS board template not found. Run pnpm db:seed or pnpm db:seed-template.",
    );
  }

  return db.transaction(async (tx) => {
    const board = must(
      (
        await tx
          .insert(boards)
          .values({
            name: input.boardName,
            isTemplate: false,
            competitionId: input.competitionId,
          })
          .returning()
      )[0],
      "board",
    );

    const labelIdMap = new Map<number, number>();
    for (const label of template.labels) {
      const created = must(
        (
          await tx
            .insert(labels)
            .values({
              boardId: board.id,
              name: label.name,
              color: label.color,
            })
            .returning()
        )[0],
        "label",
      );
      labelIdMap.set(label.id, created.id);
    }

    for (const list of template.lists) {
      const createdList = must(
        (
          await tx
            .insert(boardLists)
            .values({
              boardId: board.id,
              title: list.title,
              position: list.position,
            })
            .returning()
        )[0],
        "list",
      );

      for (const card of list.cards) {
        const createdCard = must(
          (
            await tx
              .insert(cards)
              .values({
                listId: createdList.id,
                title: card.title,
                description: card.description,
                position: card.position,
                coverUrl: card.coverUrl,
                dueDate: card.dueDate,
              })
              .returning()
          )[0],
          "card",
        );

        const nextLabels = card.cardLabels
          .map((cl) => {
            const newLabelId = labelIdMap.get(cl.labelId);
            if (!newLabelId) return null;
            return {
              cardId: createdCard.id,
              labelId: newLabelId,
            };
          })
          .filter((v): v is { cardId: number; labelId: number } => v !== null);

        if (nextLabels.length > 0) {
          await tx.insert(cardLabels).values(nextLabels);
        }

        for (const checklist of card.checklists) {
          const createdChecklist = must(
            (
              await tx
                .insert(checklists)
                .values({
                  cardId: createdCard.id,
                  title: checklist.title,
                  position: checklist.position,
                })
                .returning()
            )[0],
            "checklist",
          );

          if (checklist.items.length > 0) {
            await tx.insert(checklistItems).values(
              checklist.items.map((item) => ({
                checklistId: createdChecklist.id,
                title: item.title,
                done: false,
                position: item.position,
              })),
            );
          }
        }

        if (card.attachments.length > 0) {
          await tx.insert(cardAttachments).values(
            card.attachments.map((attachment) => ({
              cardId: createdCard.id,
              name: attachment.name,
              url: attachment.url,
            })),
          );
        }
      }
    }

    await tx
      .update(competitions)
      .set({
        boardId: board.id,
        trelloAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(competitions.id, input.competitionId));

    return board;
  });
}
