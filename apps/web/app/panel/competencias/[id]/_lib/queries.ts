import "server-only";

import { db } from "@/db";

export async function getCompetitionWithRelations(id: number) {
  return db.query.competitions.findFirst({
    where: (competition, { eq }) => eq(competition.id, id),
    with: {
      delegates: {
        with: {
          delegate: true,
        },
      },
      organizers: {
        with: {
          organizer: true,
        },
      },
    },
  });
}

export async function getAllDelegates() {
  return db.query.user.findMany({
    where: (user, { eq }) => eq(user.role, "delegate"),
    orderBy: (user, { asc }) => asc(user.name),
  });
}

export async function getCompetitionLogs(competitionId: number) {
  return db.query.logs.findMany({
    where: (log, { eq }) => eq(log.targetId, String(competitionId)),
    with: { actor: true },
    orderBy: (log, { desc }) => desc(log.createdAt),
  });
}
