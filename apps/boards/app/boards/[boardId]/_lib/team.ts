import type { BoardDetail } from "./types";

export type TeamPerson = {
  userId: string;
  wcaId: string;
  name: string;
  image: string | null;
  isPrimary: boolean;
};

export function getCompetitionTeam(board: BoardDetail): TeamPerson[] {
  const byUserId = new Map<string, TeamPerson>();

  if (board.competition) {
    for (const row of board.competition.delegates) {
      if (!row.delegate) continue;
      byUserId.set(row.delegate.id, {
        userId: row.delegate.id,
        wcaId: row.delegate.wcaId,
        name: row.delegate.name,
        image: row.delegate.image,
        isPrimary: row.isPrimary,
      });
    }
    for (const row of board.competition.organizers) {
      if (!row.organizer) continue;
      const existing = byUserId.get(row.organizer.id);
      byUserId.set(row.organizer.id, {
        userId: row.organizer.id,
        wcaId: row.organizer.wcaId,
        name: row.organizer.name,
        image: row.organizer.image,
        isPrimary: existing?.isPrimary || row.isPrimary,
      });
    }
  }

  for (const row of board.members ?? []) {
    if (!row.user) continue;
    if (byUserId.has(row.user.id)) continue;
    byUserId.set(row.user.id, {
      userId: row.user.id,
      wcaId: row.user.wcaId,
      name: row.user.name,
      image: row.user.image,
      isPrimary: false,
    });
  }

  return [...byUserId.values()].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
}
