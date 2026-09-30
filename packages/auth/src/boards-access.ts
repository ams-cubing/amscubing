import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { boardMembers, competitionOrganizers } from "@workspace/db/schema";

/**
 * Tableros AMS is open to delegates, organizers of any competition, and users
 * who were added to a board (e.g. via invite). Per-board access is checked
 * separately by the boards app.
 */
export async function canAccessBoardsApp(
  user: { id: string; role: string } | null | undefined,
): Promise<boolean> {
  if (!user) {
    return false;
  }

  if (user.role === "delegate") {
    return true;
  }

  const [organizer, member] = await Promise.all([
    db.query.competitionOrganizers.findFirst({
      where: eq(competitionOrganizers.organizerUserId, user.id),
      columns: { competitionId: true },
    }),
    db.query.boardMembers.findFirst({
      where: eq(boardMembers.userId, user.id),
      columns: { boardId: true },
    }),
  ]);

  return Boolean(organizer || member);
}
