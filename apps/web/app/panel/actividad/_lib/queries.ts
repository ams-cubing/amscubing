import "server-only";

import { db } from "@/db";
import { logs, user, competitions, type User, type Competition } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

export async function getActivityLogs() {
  const logsData = await db
    .select({
      id: logs.id,
      actorId: logs.actorId,
      action: logs.action,
      targetType: logs.targetType,
      targetId: logs.targetId,
      details: logs.details,
      createdAt: logs.createdAt,
      actor: { name: user.name },
    })
    .from(logs)
    .innerJoin(user, eq(logs.actorId, user.id))
    .orderBy(desc(logs.createdAt))
    .limit(100);

  const competitionIds = Array.from(
    new Set(
      logsData
        .filter((l) => l.targetType === "competition")
        .map((l) => Number(l.targetId)),
    ),
  );

  const userIds = Array.from(
    new Set(
      logsData
        .filter((l) => l.targetType === "availability")
        .map((l) => l.targetId),
    ),
  );

  const competitionsMap = new Map<string | number, Competition>();
  if (competitionIds.length) {
    const comps = await db
      .select()
      .from(competitions)
      .where(inArray(competitions.id, competitionIds));
    for (const c of comps) competitionsMap.set(c.id, c);
  }

  const usersMap = new Map<string | number, User>();
  if (userIds.length) {
    const users = await db
      .select()
      .from(user)
      .where(inArray(user.wcaId, userIds));
    for (const u of users) usersMap.set(u.wcaId, u);
  }

  return logsData.map((l) => {
    let targetLabel: string;
    if (l.targetType === "competition") {
      const comp = competitionsMap.get(Number(l.targetId));
      targetLabel = comp?.name ?? `Competencia sin nombre en ${comp?.city}`;
    } else if (l.targetType === "availability") {
      const u = usersMap.get(l.targetId);
      targetLabel = u?.name ?? `${l.targetType} / ${l.targetId}`;
    } else {
      targetLabel = `${l.targetType} / ${l.targetId}`;
    }
    return {
      ...l,
      targetLabel,
      actorName: l.actor?.name ?? l.actorId,
    };
  });
}
