import { db } from "@/db";
import {
  logs,
  user,
  competitions,
  type User,
  type Competition,
} from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import ActivityTable from "./_components/data-table";

export default async function Page() {
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

  // batch fetch targets by type (example: competitions). Add more types as needed.
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

  function renderTarget(l: (typeof logsData)[number]) {
    if (l.targetType === "competition") {
      const comp = competitionsMap.get(Number(l.targetId));
      const label = comp?.name ?? `Competencia sin nombre en ${comp?.city}`;
      return label;
    }

    if (l.targetType === "availability") {
      const u = usersMap.get(l.targetId);
      const label = u?.name ?? `${l.targetType} / ${l.targetId}`;
      return label;
    }

    // fallback for other types: show type/id (add additional maps like competitionsMap above for other types)
    return `${l.targetType} / ${l.targetId}`;
  }

  const logsForClient = logsData.map((l) => ({
    ...l,
    targetLabel: renderTarget(l),
    actorName: l.actor?.name ?? l.actorId,
  }));

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Actividad</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Historial de acciones y cambios en el sistema.
          </p>
        </div>
        <ActivityTable data={logsForClient} />
      </div>
    </main>
  );
}
