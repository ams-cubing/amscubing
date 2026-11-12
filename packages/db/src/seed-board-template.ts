import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  max,
  or,
  sql,
} from "drizzle-orm";

import { COMPETITION_BOARD_TEMPLATE } from "./data/ams-board-template";
import { CHAMPIONSHIP_BOARD_TEMPLATE } from "./data/ams-championship-template";
import {
  BOARD_TEMPLATE_KEYS,
  type BoardTemplateCard,
  type BoardTemplateDefinition,
  type BoardTemplateKey,
} from "./data/board-templates";
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

export const BOARD_TEMPLATES: Record<
  BoardTemplateKey,
  BoardTemplateDefinition
> = {
  competition: COMPETITION_BOARD_TEMPLATE,
  championship: CHAMPIONSHIP_BOARD_TEMPLATE,
};

type LabelRow = typeof labels.$inferSelect;
type ListRow = typeof boardLists.$inferSelect;

type SyncBoardResult = {
  inserted: number;
  listsReordered: number;
  skipped?: string;
};

async function insertTemplateCard(input: {
  cardDef: BoardTemplateCard;
  position: number;
  listByTitle: Map<string, ListRow>;
  labelByKey: Map<string, LabelRow>;
}) {
  const { cardDef, position, listByTitle, labelByKey } = input;
  const list = listByTitle.get(cardDef.list);
  if (!list) {
    throw new Error(`Missing list «${cardDef.list}» for ${cardDef.title}`);
  }
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

  if (cardDef.labels.length > 0) {
    await db.insert(cardLabels).values(
      cardDef.labels.map((key) => {
        const label = labelByKey.get(key);
        if (!label) {
          throw new Error(`Missing label «${key}» for ${cardDef.title}`);
        }
        return { cardId: card.id, labelId: label.id };
      }),
    );
  }

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

function buildLabelByKey(
  template: BoardTemplateDefinition,
  labelRows: LabelRow[],
) {
  const byName = new Map(labelRows.map((row) => [row.name, row]));
  const labelByKey = new Map<string, LabelRow>();
  for (const label of template.labels) {
    const row = byName.get(label.name);
    if (!row) {
      throw new Error(`Missing template label on board: ${label.name}`);
    }
    labelByKey.set(label.key, row);
  }
  return labelByKey;
}

function tryBuildListByTitle(
  template: BoardTemplateDefinition,
  listRows: ListRow[],
) {
  const listByTitle = new Map(listRows.map((list) => [list.title, list]));
  const missing = template.lists.filter((title) => !listByTitle.has(title));
  return { listByTitle, missing };
}

async function syncMissingTemplateLabels(
  template: BoardTemplateDefinition,
  boardId: number,
) {
  const existing = await db.query.labels.findMany({
    where: eq(labels.boardId, boardId),
    columns: { name: true },
  });
  const existingNames = new Set(existing.map((l) => l.name));
  const missing = template.labels.filter((l) => !existingNames.has(l.name));
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
 * Places template cards in template order within each list.
 * Non-template (custom) cards keep their relative order after template cards.
 */
async function reorderTemplateCardsToSeedOrder(
  template: BoardTemplateDefinition,
  listByTitle: Map<string, ListRow>,
) {
  let reordered = 0;
  for (const listTitle of template.lists) {
    const list = listByTitle.get(listTitle);
    if (!list) continue;
    const listCards = await db.query.cards.findMany({
      where: eq(cards.listId, list.id),
      columns: { id: true, title: true, position: true },
      orderBy: (c, { asc }) => [asc(c.position)],
    });

    const byTitle = new Map(listCards.map((card) => [card.title, card]));
    const templateTitleOrder = template.cards
      .filter((cardDef) => cardDef.list === listTitle)
      .map((cardDef) => cardDef.title);
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
  template: BoardTemplateDefinition,
  listId: number,
  cardDef: BoardTemplateCard,
) {
  const listCards = await db.query.cards.findMany({
    where: eq(cards.listId, listId),
    columns: { title: true, position: true },
    orderBy: (c, { asc }) => [asc(c.position)],
  });

  const sameListTitles = template.cards
    .filter((c) => c.list === cardDef.list)
    .map((c) => c.title);
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
 * Inserts any template cards missing from a board (by title across all lists).
 * When `reorderToSeedOrder` is true (template board), also rewrites positions.
 */
async function syncMissingCardsOntoBoard(
  template: BoardTemplateDefinition,
  boardId: number,
  options: { reorderToSeedOrder: boolean; label?: string },
): Promise<SyncBoardResult> {
  const label = options.label ?? `board id=${boardId}`;
  await syncMissingTemplateLabels(template, boardId);

  const listRows = await db.query.boardLists.findMany({
    where: eq(boardLists.boardId, boardId),
  });
  const { listByTitle, missing: missingLists } = tryBuildListByTitle(
    template,
    listRows,
  );
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
  const labelByKey = buildLabelByKey(template, labelRows);

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
  for (const cardDef of template.cards) {
    if (allExistingTitles.has(cardDef.title)) continue;

    const list = listByTitle.get(cardDef.list)!;
    const insertPosition = options.reorderToSeedOrder
      ? await db
          .select({ value: max(cards.position) })
          .from(cards)
          .where(eq(cards.listId, list.id))
          .then((rows) => (rows[0]?.value ?? -1) + 1)
      : await resolveInsertPosition(template, list.id, cardDef);

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
    ? await reorderTemplateCardsToSeedOrder(template, listByTitle)
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

async function syncMissingTemplateCards(
  template: BoardTemplateDefinition,
  boardId: number,
) {
  const result = await syncMissingCardsOntoBoard(template, boardId, {
    reorderToSeedOrder: true,
    label: `«${template.name}» (id=${boardId})`,
  });
  if (result.inserted === 0 && result.listsReordered === 0) {
    console.log(`⏭️  «${template.name}» already up to date`);
  }
}

/** Backfill missing template cards onto every competition board cloned from it. */
export async function syncMissingTemplateCardsOntoCompetitionBoards(
  template: BoardTemplateDefinition,
) {
  const targets = await db.query.boards.findMany({
    where: and(
      eq(boards.isTemplate, false),
      isNotNull(boards.competitionId),
      eq(boards.templateKey, template.key),
    ),
    columns: { id: true, name: true, competitionId: true },
  });

  let boardsUpdated = 0;
  let cardsInserted = 0;
  let boardsSkipped = 0;

  for (const board of targets) {
    const result = await syncMissingCardsOntoBoard(template, board.id, {
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
      `✅ Backfilled ${cardsInserted} card(s) across ${boardsUpdated} ${template.key} board(s)`,
    );
  } else {
    console.log(`⏭️  ${template.key} boards already have all template cards`);
  }

  if (boardsSkipped > 0) {
    console.log(`⚠️  Skipped ${boardsSkipped} board(s) with incomplete lists`);
  }

  return { boardsUpdated, cardsInserted, boardsSkipped, total: targets.length };
}

function templateBoardWhere(template: BoardTemplateDefinition) {
  return and(
    eq(boards.isTemplate, true),
    or(
      eq(boards.templateKey, template.key),
      and(isNull(boards.templateKey), eq(boards.name, template.name)),
    ),
  );
}

async function createFreshBoardTemplate(template: BoardTemplateDefinition) {
  console.log(`⏳ Seeding «${template.name}»...`);

  const [boardRow] = await db
    .insert(boards)
    .values({
      name: template.name,
      isTemplate: true,
      templateKey: template.key,
      competitionId: null,
    })
    .returning();

  if (!boardRow) {
    throw new Error(`Failed to create «${template.name}»`);
  }
  const board = boardRow;

  const labelRows = await db
    .insert(labels)
    .values(
      template.labels.map((label) => ({
        boardId: board.id,
        name: label.name,
        color: label.color,
      })),
    )
    .returning();
  const labelByKey = buildLabelByKey(template, labelRows);

  const listRows = await db
    .insert(boardLists)
    .values(
      template.lists.map((title, position) => ({
        boardId: board.id,
        title,
        position,
      })),
    )
    .returning();
  const listByTitle = new Map(listRows.map((list) => [list.title, list]));

  const positionByList = new Map<string, number>();
  for (const cardDef of template.cards) {
    const position = positionByList.get(cardDef.list) ?? 0;
    positionByList.set(cardDef.list, position + 1);
    await insertTemplateCard({
      cardDef,
      position,
      listByTitle,
      labelByKey,
    });
  }

  console.log(`✅ Seeded «${template.name}» (id=${board.id})`);
  return board.id;
}

async function removeRetiredTemplateCards(template: BoardTemplateDefinition) {
  if (template.retiredCardTitles.length === 0) return;

  const removed = await db
    .delete(cards)
    .where(inArray(cards.title, [...template.retiredCardTitles]))
    .returning({ id: cards.id, title: cards.title });

  if (removed.length > 0) {
    console.log(
      `🗑️  Removed ${removed.length} retired board card(s): ${template.retiredCardTitles.join(", ")}`,
    );
  }
}

async function seedBoardTemplate(template: BoardTemplateDefinition) {
  await removeRetiredTemplateCards(template);

  const existing = await db.query.boards.findFirst({
    where: templateBoardWhere(template),
  });

  let templateId: number;
  if (existing) {
    if (existing.templateKey !== template.key) {
      await db
        .update(boards)
        .set({ templateKey: template.key })
        .where(eq(boards.id, existing.id));
    }
    await syncMissingTemplateCards(template, existing.id);
    templateId = existing.id;
  } else {
    templateId = await createFreshBoardTemplate(template);
  }

  await syncMissingTemplateCardsOntoCompetitionBoards(template);

  return templateId;
}

/** Creates or syncs every AMS template, then backfills their competition boards. */
export async function seedAmsBoardTemplate(
  keys: readonly BoardTemplateKey[] = BOARD_TEMPLATE_KEYS,
) {
  const ids: Partial<Record<BoardTemplateKey, number>> = {};
  for (const key of keys) {
    ids[key] = await seedBoardTemplate(BOARD_TEMPLATES[key]);
  }
  return ids;
}

/** Deletes the given AMS template board (if any) and recreates it from seed data. */
export async function reseedAmsBoardTemplate(key: BoardTemplateKey) {
  const template = BOARD_TEMPLATES[key];
  await removeRetiredTemplateCards(template);

  const removed = await db
    .delete(boards)
    .where(templateBoardWhere(template))
    .returning({ id: boards.id });

  if (removed.length > 0) {
    console.log(
      `🗑️  Removed existing «${template.name}» (id=${removed.map((row) => row.id).join(", ")})`,
    );
  }

  return createFreshBoardTemplate(template);
}
