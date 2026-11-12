import { and, eq, isNull, sql } from "drizzle-orm";

import { TEMPLATE_BOARD_NAME } from "./data/ams-board-template";
import {
  BOARD_TEMPLATE_LABELS,
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
  competitions,
  labels,
} from "./schema";

/** A competition board is always named after its competition. */
export function competitionBoardName(competition: {
  name: string | null;
  city: string;
  startDate: string;
}) {
  return (
    competition.name?.trim() ||
    `${competition.city.trim()} — ${competition.startDate}`
  );
}

function must<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Expected ${label} from database insert`);
  }
  return value;
}

const templateBoardWith = {
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
} satisfies NonNullable<
  Parameters<typeof db.query.boards.findFirst>[0]
>["with"];

export async function getTemplateBoard(
  templateKey: BoardTemplateKey = "competition",
) {
  const byKey = await db.query.boards.findFirst({
    where: and(
      eq(boards.isTemplate, true),
      eq(boards.templateKey, templateKey),
    ),
    with: templateBoardWith,
  });
  if (byKey || templateKey !== "competition") return byKey;

  const named = await db.query.boards.findFirst({
    where: and(
      eq(boards.isTemplate, true),
      eq(boards.name, TEMPLATE_BOARD_NAME),
    ),
    with: templateBoardWith,
  });
  if (named) return named;

  return db.query.boards.findFirst({
    where: and(eq(boards.isTemplate, true), isNull(boards.templateKey)),
    with: templateBoardWith,
  });
}

type TemplateBoard = NonNullable<Awaited<ReturnType<typeof getTemplateBoard>>>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function requireTemplateBoard(templateKey: BoardTemplateKey) {
  const template = await getTemplateBoard(templateKey);
  if (!template) {
    throw new Error(
      `No se encontró la plantilla «${BOARD_TEMPLATE_LABELS[templateKey]}». Ejecuta pnpm --filter @workspace/db db:sync-template.`,
    );
  }
  return template;
}

export async function cloneBoardFromTemplate(input: {
  competitionId: number;
  boardName: string;
  templateKey?: BoardTemplateKey;
}) {
  const existing = await db.query.boards.findFirst({
    where: eq(boards.competitionId, input.competitionId),
  });

  if (existing) {
    return existing;
  }

  const templateKey = input.templateKey ?? "competition";
  const template = await requireTemplateBoard(templateKey);

  return db.transaction((tx) =>
    insertBoardFromTemplate(tx, template, { ...input, templateKey }),
  );
}

async function insertBoardFromTemplate(
  tx: Tx,
  template: TemplateBoard,
  input: {
    competitionId: number;
    boardName: string;
    templateKey: BoardTemplateKey;
  },
) {
  const board = must(
    (
      await tx
        .insert(boards)
        .values({
          name: input.boardName,
          isTemplate: false,
          templateKey: input.templateKey,
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
}

/** Margin over the clone timestamp; cloned rows share the transaction's now(). */
const CLONE_WINDOW = sql`interval '10 seconds'`;

/**
 * Template of a competition board and whether anyone has worked on it since it
 * was cloned (members, invites, comments, assignees, ticked items, new or edited cards).
 */
export async function getBoardTemplateState(
  boardId: number,
  executor: Pick<typeof db, "execute"> = db,
) {
  const rows = await executor.execute<{
    template_key: BoardTemplateKey | null;
    has_activity: boolean;
  }>(sql`
    select b.template_key,
      exists (select 1 from board_member m where m.board_id = b.id)
      or exists (
        select 1 from board_invite i
        where i.board_id = b.id and i.revoked_at is null
      )
      or exists (
        select 1 from card c
        join board_list l on l.id = c.list_id
        where l.board_id = b.id and (
          c.created_at > b.created_at + ${CLONE_WINDOW}
          or c.updated_at > b.created_at + ${CLONE_WINDOW}
          or exists (select 1 from card_comment cc where cc.card_id = c.id)
          or exists (select 1 from card_member cm where cm.card_id = c.id)
          or exists (
            select 1 from card_attachment a
            where a.card_id = c.id and a.created_at > b.created_at + ${CLONE_WINDOW}
          )
          or exists (
            select 1 from checklist ch
            join checklist_item ci on ci.checklist_id = ch.id
            where ch.card_id = c.id and ci.done
          )
        )
      ) as has_activity
    from board b
    where b.id = ${boardId}
  `);
  const row = rows[0];
  if (!row) return null;
  return {
    templateKey: row.template_key,
    hasActivity: row.has_activity,
  };
}

/** Replaces a competition's board with a fresh clone of another template while nobody has used it. */
export async function switchBoardTemplate(input: {
  competitionId: number;
  templateKey: BoardTemplateKey;
}) {
  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, input.competitionId),
    columns: {
      id: true,
      name: true,
      city: true,
      startDate: true,
      boardId: true,
    },
  });
  if (!competition?.boardId) {
    throw new Error("La competencia no tiene tablero");
  }
  const boardId = competition.boardId;

  const template = await requireTemplateBoard(input.templateKey);

  return db.transaction(async (tx) => {
    const state = await getBoardTemplateState(boardId, tx);
    if (!state) throw new Error("Tablero no encontrado");
    if (state.templateKey === input.templateKey) {
      throw new Error("El tablero ya usa esa plantilla");
    }
    if (state.hasActivity) {
      throw new Error(
        "El tablero ya tiene actividad; no se puede cambiar la plantilla",
      );
    }

    await tx.delete(boards).where(eq(boards.id, boardId));
    return insertBoardFromTemplate(tx, template, {
      competitionId: competition.id,
      boardName: competitionBoardName(competition),
      templateKey: input.templateKey,
    });
  });
}
