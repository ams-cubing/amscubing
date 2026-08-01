import { and, eq } from "drizzle-orm";

import {
  PHASE_LABELS,
  TEMPLATE_BOARD_NAME,
  TEMPLATE_CARDS,
  TEMPLATE_LISTS,
  type PhaseLabelKey,
} from "./data/ams-board-template";
import { db } from "./index";
import {
  boardLists,
  boards,
  cardAttachments,
  cardLabels,
  cards,
  checklistItems,
  checklists,
  labels,
} from "./schema";

export async function seedAmsBoardTemplate() {
  const existing = await db.query.boards.findFirst({
    where: and(
      eq(boards.isTemplate, true),
      eq(boards.name, TEMPLATE_BOARD_NAME),
    ),
  });

  if (existing) {
    console.log("⏭️  AMS board template already exists, skipping");
    return existing.id;
  }

  console.log("⏳ Seeding AMS board template...");

  const [boardRow] = await db
    .insert(boards)
    .values({
      name: TEMPLATE_BOARD_NAME,
      isTemplate: true,
      competitionId: null,
    })
    .returning();

  if (!boardRow) {
    throw new Error("Failed to create AMS board template");
  }
  const board = boardRow;

  const labelRows = await db
    .insert(labels)
    .values(
      PHASE_LABELS.map((label) => ({
        boardId: board.id,
        name: label.name,
        color: label.color,
      })),
    )
    .returning();

  const labelByKey = Object.fromEntries(
    PHASE_LABELS.map((phase, index) => [phase.key, labelRows[index]!]),
  ) as Record<PhaseLabelKey, (typeof labelRows)[number]>;

  const listRows = await db
    .insert(boardLists)
    .values(
      TEMPLATE_LISTS.map((title, position) => ({
        boardId: board.id,
        title,
        position,
      })),
    )
    .returning();

  const listByTitle = Object.fromEntries(
    listRows.map((list) => [list.title, list]),
  ) as Record<(typeof TEMPLATE_LISTS)[number], (typeof listRows)[number]>;

  for (const [index, cardDef] of TEMPLATE_CARDS.entries()) {
    const list = listByTitle[cardDef.list];
    const [cardRow] = await db
      .insert(cards)
      .values({
        listId: list.id,
        title: cardDef.title,
        description: cardDef.description ?? null,
        position: index,
        coverUrl: cardDef.coverUrl ?? null,
      })
      .returning();

    if (!cardRow) {
      throw new Error(`Failed to create template card: ${cardDef.title}`);
    }
    const card = cardRow;

    await db.insert(cardLabels).values({
      cardId: card.id,
      labelId: labelByKey[cardDef.phase].id,
    });

    if (cardDef.checklist) {
      const [checklistRow] = await db
        .insert(checklists)
        .values({
          cardId: card.id,
          title: cardDef.checklist.title,
          position: 0,
        })
        .returning();

      if (!checklistRow) {
        throw new Error(`Failed to create checklist for ${cardDef.title}`);
      }

      await db.insert(checklistItems).values(
        cardDef.checklist.items.map((title, position) => ({
          checklistId: checklistRow.id,
          title,
          done: false,
          position,
        })),
      );
    }

    if (cardDef.attachments?.length) {
      await db.insert(cardAttachments).values(
        cardDef.attachments.map((attachment) => ({
          cardId: card.id,
          name: attachment.name,
          url: attachment.url,
        })),
      );
    }
  }

  console.log(`✅ Seeded AMS board template (id=${board.id})`);
  return board.id;
}
