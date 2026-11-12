import "./env";

import { eq, sql } from "drizzle-orm";

import {
  cloneBoardFromTemplate,
  getBoardTemplateState,
  switchBoardTemplate,
} from "./clone-board";
import { db } from "./index";
import { boardLists, boards, cards, competitions } from "./schema";

async function cardCount(boardId: number) {
  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(boardLists, eq(boardLists.id, cards.listId))
    .where(eq(boardLists.boardId, boardId));
  return rows.length;
}

async function main() {
  const state = await db.query.states.findFirst({ columns: { id: true } });
  const [competition] = await db
    .insert(competitions)
    .values({
      name: "TMP switch test",
      city: "Test",
      stateId: state!.id,
      startDate: "2099-01-01",
      endDate: "2099-01-03",
      isChampionship: true,
    })
    .returning();
  try {
    const board = await cloneBoardFromTemplate({
      competitionId: competition!.id,
      boardName: "TMP switch test",
    });
    console.log("cloned", board.id, await getBoardTemplateState(board.id), await cardCount(board.id));

    const switched = await switchBoardTemplate({
      competitionId: competition!.id,
      templateKey: "championship",
    });
    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, competition!.id),
      columns: { boardId: true },
    });
    const oldStillThere = await db.query.boards.findFirst({ where: eq(boards.id, board.id) });
    console.log("switched", switched.id, await getBoardTemplateState(switched.id), await cardCount(switched.id), "competition.boardId", comp?.boardId, "old board exists", Boolean(oldStillThere));

    const anyCard = await db
      .select({ id: cards.id })
      .from(cards)
      .innerJoin(boardLists, eq(boardLists.id, cards.listId))
      .where(eq(boardLists.boardId, switched.id))
      .limit(1);
    await db.execute(
      sql`update card set updated_at = now() + interval '1 minute' where id = ${anyCard[0]!.id}`,
    );
    console.log("after edit", await getBoardTemplateState(switched.id));
    try {
      await switchBoardTemplate({ competitionId: competition!.id, templateKey: "competition" });
      console.log("ERROR: switch with activity succeeded");
    } catch (error) {
      console.log("refused:", (error as Error).message);
    }
  } finally {
    await db.delete(competitions).where(eq(competitions.id, competition!.id));
    const leftover = await db.query.boards.findFirst({
      where: eq(boards.competitionId, competition!.id),
    });
    console.log("cleanup ok", !leftover);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
