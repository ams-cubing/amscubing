import { db } from "@workspace/db";
import {
  BOARDS_TOOLS_DENIED_MESSAGE,
  boardHasBoardsToolsBeta,
} from "@workspace/db/beta-features";

export { BOARDS_TOOLS_DENIED_MESSAGE };

export async function boardHasToolsBeta(boardId: number) {
  return boardHasBoardsToolsBeta(db, boardId);
}

export async function requireBoardToolsBeta(boardId: number) {
  if (!(await boardHasBoardsToolsBeta(db, boardId))) {
    throw new Error(BOARDS_TOOLS_DENIED_MESSAGE);
  }
}

/** For actions that return `{ ok: false, message }` instead of throwing. */
export async function boardsToolsBetaDenial(
  boardId: number,
): Promise<string | null> {
  return (await boardHasBoardsToolsBeta(db, boardId))
    ? null
    : BOARDS_TOOLS_DENIED_MESSAGE;
}
