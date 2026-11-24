import { db } from "@workspace/db";
import {
  BOARDS_TOOLS_DENIED_MESSAGE,
  userHasBoardsToolsBeta,
} from "@workspace/db/beta-features";

import { resolveSessionUserId } from "./board-access";

export { BOARDS_TOOLS_DENIED_MESSAGE };

export async function sessionHasBoardsToolsBeta(actor: {
  id: string;
  wcaId: string | null;
}) {
  const userId = await resolveSessionUserId(actor);
  return userHasBoardsToolsBeta(db, userId);
}

export async function requireSessionBoardsToolsBeta(actor: {
  id: string;
  wcaId: string | null;
}) {
  const userId = await resolveSessionUserId(actor);
  if (!(await userHasBoardsToolsBeta(db, userId))) {
    throw new Error(BOARDS_TOOLS_DENIED_MESSAGE);
  }
  return userId;
}

/** For actions that return `{ ok: false, message }` instead of throwing. */
export async function boardsToolsBetaDenial(actor: {
  id: string;
  wcaId: string | null;
}): Promise<string | null> {
  return (await sessionHasBoardsToolsBeta(actor))
    ? null
    : BOARDS_TOOLS_DENIED_MESSAGE;
}
