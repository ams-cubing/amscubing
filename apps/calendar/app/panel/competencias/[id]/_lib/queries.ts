import "server-only";

import { db } from "@workspace/db";
import { hasWcaId } from "@workspace/db/utils";
import { cacheLife, cacheTag } from "next/cache";

export async function getCompetitionWithRelations(id: number) {
  "use cache";
  cacheLife("seconds");
  cacheTag(`competition-${id}`);
  cacheTag("competitions");
  return db.query.competitions.findFirst({
    where: (competition, { eq }) => eq(competition.id, id),
    with: {
      state: {
        with: {
          region: true,
        },
      },
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
      requester: {
        columns: { name: true, wcaId: true },
      },
    },
  });
}

export async function getAllDelegates() {
  const rows = await db.query.user.findMany({
    where: (user, { eq }) => eq(user.role, "delegate"),
    orderBy: (user, { asc }) => asc(user.name),
  });
  return rows.filter(hasWcaId);
}

export async function getCompetitionLogs(competitionId: number) {
  return db.query.logs.findMany({
    where: (log, { eq }) => eq(log.targetId, String(competitionId)),
    with: { actor: true },
    orderBy: (log, { desc }) => desc(log.createdAt),
  });
}
