import { and, eq, inArray, max } from "drizzle-orm";

import {
  PHASE_LABELS,
  REMOVED_TEMPLATE_CARD_TITLES,
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

type LabelRow = typeof labels.$inferSelect;
type ListRow = typeof boardLists.$inferSelect;

async function insertTemplateCard(input: {
  cardDef: (typeof TEMPLATE_CARDS)[number];
  position: number;
  listByTitle: Record<(typeof TEMPLATE_LISTS)[number], ListRow>;
  labelByKey: Record<PhaseLabelKey, LabelRow>;
}) {
  const { cardDef, position, listByTitle, labelByKey } = input;
  const list = listByTitle[cardDef.list];
  const [cardRow] = await db
    .insert(cards)
    .values({
      listId: list.id,
      title: cardDef.title,
      description: cardDef.description ?? null,
      position,
      coverUrl: cardDef.coverUrl ?? null,
    })
    .returning();

  if (!cardRow) {
    throw new Error(`Failed to create template card: ${cardDef.title}`);
  }
  const card = cardRow;

  await db.insert(cardLabels).values(
    cardDef.phases.map((phase) => ({
      cardId: card.id,
      labelId: labelByKey[phase].id,
    })),
  );

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
      cardDef.checklist.items.map((title, itemPosition) => ({
        checklistId: checklistRow.id,
        title,
        done: false,
        position: itemPosition,
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

function buildLabelByKey(labelRows: LabelRow[]) {
  const byName = new Map(labelRows.map((row) => [row.name, row]));
  const labelByKey = {} as Record<PhaseLabelKey, LabelRow>;
  for (const phase of PHASE_LABELS) {
    const row = byName.get(phase.name);
    if (!row) {
      throw new Error(`Missing phase label on template: ${phase.name}`);
    }
    labelByKey[phase.key] = row;
  }
  return labelByKey;
}

function buildListByTitle(listRows: ListRow[]) {
  const listByTitle = Object.fromEntries(
    listRows.map((list) => [list.title, list]),
  ) as Record<(typeof TEMPLATE_LISTS)[number], ListRow>;

  for (const title of TEMPLATE_LISTS) {
    if (!listByTitle[title]) {
      throw new Error(`Missing list on template: ${title}`);
    }
  }

  return listByTitle;
}

async function syncMissingTemplateLabels(boardId: number) {
  const existing = await db.query.labels.findMany({
    where: eq(labels.boardId, boardId),
    columns: { name: true },
  });
  const existingNames = new Set(existing.map((l) => l.name));
  const missing = PHASE_LABELS.filter((l) => !existingNames.has(l.name));
  if (missing.length === 0) return;

  await db.insert(labels).values(
    missing.map((label) => ({
      boardId,
      name: label.name,
      color: label.color,
    })),
  );
  console.log(
    `✅ Synced ${missing.length} missing label(s) onto AMS board template (id=${boardId})`,
  );
}

/**
 * Places template cards in TEMPLATE_CARDS order within each list.
 * Non-template (custom) cards keep their relative order after template cards.
 */
async function reorderTemplateCardsToSeedOrder(
  listByTitle: Record<(typeof TEMPLATE_LISTS)[number], ListRow>,
) {
  const templateTitlesByList = Object.fromEntries(
    TEMPLATE_LISTS.map((title) => [title, [] as string[]]),
  ) as Record<(typeof TEMPLATE_LISTS)[number], string[]>;

  for (const cardDef of TEMPLATE_CARDS) {
    templateTitlesByList[cardDef.list].push(cardDef.title);
  }

  let reordered = 0;
  for (const listTitle of TEMPLATE_LISTS) {
    const list = listByTitle[listTitle];
    const listCards = await db.query.cards.findMany({
      where: eq(cards.listId, list.id),
      columns: { id: true, title: true, position: true },
      orderBy: (c, { asc }) => [asc(c.position)],
    });

    const byTitle = new Map(listCards.map((card) => [card.title, card]));
    const templateTitleOrder = templateTitlesByList[listTitle];
    const templateTitleSet = new Set(templateTitleOrder);

    const orderedIds: number[] = [];
    for (const title of templateTitleOrder) {
      const card = byTitle.get(title);
      if (card) orderedIds.push(card.id);
    }
    for (const card of listCards) {
      if (!templateTitleSet.has(card.title)) orderedIds.push(card.id);
    }

    const needsReorder = orderedIds.some(
      (id, index) => listCards[index]?.id !== id,
    );
    if (!needsReorder) continue;

    for (const [position, cardId] of orderedIds.entries()) {
      await db
        .update(cards)
        .set({ position })
        .where(eq(cards.id, cardId));
    }
    reordered += 1;
  }

  return reordered;
}

async function syncMissingTemplateCards(boardId: number) {
  await syncMissingTemplateLabels(boardId);

  const listRows = await db.query.boardLists.findMany({
    where: eq(boardLists.boardId, boardId),
  });
  const labelRows = await db.query.labels.findMany({
    where: eq(labels.boardId, boardId),
  });

  const listByTitle = buildListByTitle(listRows);
  const labelByKey = buildLabelByKey(labelRows);

  const allExistingTitles = new Set<string>();
  for (const list of listRows) {
    const listCards = await db.query.cards.findMany({
      where: eq(cards.listId, list.id),
      columns: { title: true },
    });
    for (const card of listCards) {
      allExistingTitles.add(card.title);
    }
  }

  let inserted = 0;
  for (const cardDef of TEMPLATE_CARDS) {
    if (allExistingTitles.has(cardDef.title)) continue;

    // Temporary position; reorderTemplateCardsToSeedOrder places it correctly.
    const list = listByTitle[cardDef.list];
    const [{ value: maxPosition }] = await db
      .select({ value: max(cards.position) })
      .from(cards)
      .where(eq(cards.listId, list.id));

    const nextPosition = (maxPosition ?? -1) + 1;
    await insertTemplateCard({
      cardDef,
      position: nextPosition,
      listByTitle,
      labelByKey,
    });
    inserted += 1;
  }

  const listsReordered = await reorderTemplateCardsToSeedOrder(listByTitle);

  if (inserted > 0 || listsReordered > 0) {
    const parts: string[] = [];
    if (inserted > 0) parts.push(`${inserted} missing card(s)`);
    if (listsReordered > 0) {
      parts.push(`reordered ${listsReordered} list(s)`);
    }
    console.log(
      `✅ Synced AMS board template (id=${boardId}): ${parts.join(", ")}`,
    );
  } else {
    console.log("⏭️  AMS board template already up to date");
  }
}

const templateBoardWhere = and(
  eq(boards.isTemplate, true),
  eq(boards.name, TEMPLATE_BOARD_NAME),
);

async function createFreshAmsBoardTemplate() {
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

  const positionByList = Object.fromEntries(
    TEMPLATE_LISTS.map((title) => [title, 0]),
  ) as Record<(typeof TEMPLATE_LISTS)[number], number>;

  for (const cardDef of TEMPLATE_CARDS) {
    const position = positionByList[cardDef.list];
    positionByList[cardDef.list] = position + 1;
    await insertTemplateCard({
      cardDef,
      position,
      listByTitle,
      labelByKey,
    });
  }

  console.log(`✅ Seeded AMS board template (id=${board.id})`);
  return board.id;
}

async function removeRetiredTemplateCards() {
  if (REMOVED_TEMPLATE_CARD_TITLES.length === 0) return;

  const removed = await db
    .delete(cards)
    .where(inArray(cards.title, [...REMOVED_TEMPLATE_CARD_TITLES]))
    .returning({ id: cards.id, title: cards.title });

  if (removed.length > 0) {
    console.log(
      `🗑️  Removed ${removed.length} retired board card(s): ${REMOVED_TEMPLATE_CARD_TITLES.join(", ")}`,
    );
  }
}

export async function seedAmsBoardTemplate() {
  await removeRetiredTemplateCards();

  const existing = await db.query.boards.findFirst({
    where: templateBoardWhere,
  });

  if (existing) {
    await syncMissingTemplateCards(existing.id);
    return existing.id;
  }

  return createFreshAmsBoardTemplate();
}

/** Deletes the AMS template board (if any) and recreates it from seed data. */
export async function reseedAmsBoardTemplate() {
  await removeRetiredTemplateCards();

  const removed = await db
    .delete(boards)
    .where(templateBoardWhere)
    .returning({ id: boards.id });

  if (removed.length > 0) {
    console.log(
      `🗑️  Removed existing AMS board template (id=${removed.map((row) => row.id).join(", ")})`,
    );
  }

  return createFreshAmsBoardTemplate();
}
