import { and, eq, gte, inArray, isNotNull, max, sql } from "drizzle-orm";

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

type SyncBoardResult = {
  inserted: number;
  listsReordered: number;
  skipped?: string;
};

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

function tryBuildListByTitle(listRows: ListRow[]): {
  listByTitle: Record<(typeof TEMPLATE_LISTS)[number], ListRow>;
  missing: string[];
} {
  const listByTitle = Object.fromEntries(
    listRows.map((list) => [list.title, list]),
  ) as Record<(typeof TEMPLATE_LISTS)[number], ListRow>;

  const missing = TEMPLATE_LISTS.filter((title) => !listByTitle[title]);
  return { listByTitle, missing };
}

async function syncMissingTemplateLabels(boardId: number) {
  const existing = await db.query.labels.findMany({
    where: eq(labels.boardId, boardId),
    columns: { name: true },
  });
  const existingNames = new Set(existing.map((l) => l.name));
  const missing = PHASE_LABELS.filter((l) => !existingNames.has(l.name));
  if (missing.length === 0) return 0;

  await db.insert(labels).values(
    missing.map((label) => ({
      boardId,
      name: label.name,
      color: label.color,
    })),
  );
  return missing.length;
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
      await db.update(cards).set({ position }).where(eq(cards.id, cardId));
    }
    reordered += 1;
  }

  return reordered;
}

/** Insert position implied by neighbors already on the same list. */
async function resolveInsertPosition(
  listId: number,
  cardDef: (typeof TEMPLATE_CARDS)[number],
) {
  const listCards = await db.query.cards.findMany({
    where: eq(cards.listId, listId),
    columns: { title: true, position: true },
    orderBy: (c, { asc }) => [asc(c.position)],
  });

  const sameListTitles = TEMPLATE_CARDS.filter(
    (c) => c.list === cardDef.list,
  ).map((c) => c.title);
  const index = sameListTitles.indexOf(cardDef.title);
  const beforeTitles = sameListTitles.slice(0, index);
  const afterTitles = sameListTitles.slice(index + 1);

  for (let i = beforeTitles.length - 1; i >= 0; i -= 1) {
    const neighbor = listCards.find((c) => c.title === beforeTitles[i]);
    if (neighbor) return neighbor.position + 1;
  }
  for (const title of afterTitles) {
    const neighbor = listCards.find((c) => c.title === title);
    if (neighbor) return neighbor.position;
  }

  const [{ value: maxPosition }] = await db
    .select({ value: max(cards.position) })
    .from(cards)
    .where(eq(cards.listId, listId));
  return (maxPosition ?? -1) + 1;
}

async function shiftCardsFromPosition(listId: number, fromPosition: number) {
  await db
    .update(cards)
    .set({ position: sql`${cards.position} + 1` })
    .where(and(eq(cards.listId, listId), gte(cards.position, fromPosition)));
}

/**
 * Inserts any TEMPLATE_CARDS missing from a board (by title across all lists).
 * When `reorderToSeedOrder` is true (template board), also rewrites positions.
 */
async function syncMissingCardsOntoBoard(
  boardId: number,
  options: { reorderToSeedOrder: boolean; label?: string },
): Promise<SyncBoardResult> {
  const label = options.label ?? `board id=${boardId}`;
  await syncMissingTemplateLabels(boardId);

  const listRows = await db.query.boardLists.findMany({
    where: eq(boardLists.boardId, boardId),
  });
  const { listByTitle, missing: missingLists } = tryBuildListByTitle(listRows);
  if (missingLists.length > 0) {
    return {
      inserted: 0,
      listsReordered: 0,
      skipped: `missing lists (${missingLists.join(", ")})`,
    };
  }

  const labelRows = await db.query.labels.findMany({
    where: eq(labels.boardId, boardId),
  });
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

    const list = listByTitle[cardDef.list];
    const insertPosition = options.reorderToSeedOrder
      ? (await db
          .select({ value: max(cards.position) })
          .from(cards)
          .where(eq(cards.listId, list.id))
          .then((rows) => (rows[0]?.value ?? -1) + 1))
      : await resolveInsertPosition(list.id, cardDef);

    if (!options.reorderToSeedOrder) {
      await shiftCardsFromPosition(list.id, insertPosition);
    }

    await insertTemplateCard({
      cardDef,
      position: insertPosition,
      listByTitle,
      labelByKey,
    });
    allExistingTitles.add(cardDef.title);
    inserted += 1;
  }

  const listsReordered = options.reorderToSeedOrder
    ? await reorderTemplateCardsToSeedOrder(listByTitle)
    : 0;

  if (inserted > 0 || listsReordered > 0) {
    const parts: string[] = [];
    if (inserted > 0) parts.push(`${inserted} missing card(s)`);
    if (listsReordered > 0) {
      parts.push(`reordered ${listsReordered} list(s)`);
    }
    console.log(`✅ Synced ${label}: ${parts.join(", ")}`);
  }

  return { inserted, listsReordered };
}

async function syncMissingTemplateCards(boardId: number) {
  const result = await syncMissingCardsOntoBoard(boardId, {
    reorderToSeedOrder: true,
    label: `AMS board template (id=${boardId})`,
  });
  if (result.inserted === 0 && result.listsReordered === 0) {
    console.log("⏭️  AMS board template already up to date");
  }
}

/** Backfill missing TEMPLATE_CARDS onto every non-template competition board. */
export async function syncMissingTemplateCardsOntoCompetitionBoards() {
  const targets = await db.query.boards.findMany({
    where: and(eq(boards.isTemplate, false), isNotNull(boards.competitionId)),
    columns: { id: true, name: true, competitionId: true },
  });

  let boardsUpdated = 0;
  let cardsInserted = 0;
  let boardsSkipped = 0;

  for (const board of targets) {
    const result = await syncMissingCardsOntoBoard(board.id, {
      reorderToSeedOrder: false,
      label: `board «${board.name}» (id=${board.id})`,
    });
    if (result.skipped) {
      boardsSkipped += 1;
      console.log(
        `⏭️  Skipped board «${board.name}» (id=${board.id}): ${result.skipped}`,
      );
      continue;
    }
    if (result.inserted > 0) {
      boardsUpdated += 1;
      cardsInserted += result.inserted;
    }
  }

  if (boardsUpdated > 0) {
    console.log(
      `✅ Backfilled ${cardsInserted} card(s) across ${boardsUpdated} competition board(s)`,
    );
  } else {
    console.log("⏭️  Competition boards already have all template cards");
  }

  if (boardsSkipped > 0) {
    console.log(`⚠️  Skipped ${boardsSkipped} board(s) with incomplete lists`);
  }

  return { boardsUpdated, cardsInserted, boardsSkipped, total: targets.length };
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

  let templateId: number;
  if (existing) {
    await syncMissingTemplateCards(existing.id);
    templateId = existing.id;
  } else {
    templateId = await createFreshAmsBoardTemplate();
  }

  await syncMissingTemplateCardsOntoCompetitionBoards();

  return templateId;
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
