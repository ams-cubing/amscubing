import { and, eq, max } from "drizzle-orm";

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

async function syncMissingTemplateCards(boardId: number) {
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

  if (inserted > 0) {
    console.log(
      `✅ Synced ${inserted} missing card(s) onto AMS board template (id=${boardId})`,
    );
  } else {
    console.log("⏭️  AMS board template already up to date");
  }
}

export async function seedAmsBoardTemplate() {
  const existing = await db.query.boards.findFirst({
    where: and(
      eq(boards.isTemplate, true),
      eq(boards.name, TEMPLATE_BOARD_NAME),
    ),
  });

  if (existing) {
    await syncMissingTemplateCards(existing.id);
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
    await insertTemplateCard({
      cardDef,
      position: index,
      listByTitle,
      labelByKey,
    });
  }

  console.log(`✅ Seeded AMS board template (id=${board.id})`);
  return board.id;
}
