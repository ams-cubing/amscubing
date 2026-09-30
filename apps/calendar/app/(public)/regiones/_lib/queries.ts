import "server-only";

import { db } from "@workspace/db";
import { hasWcaId } from "@workspace/db/utils";

export async function getDelegatesWithRegions() {
  const rows = await db.query.user.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
    where: (t, { eq }) => eq(t.role, "delegate"),
    with: {
      region: true,
    },
  });
  return rows.filter(hasWcaId);
}

export async function getRegionsWithStates() {
  return db.query.regions.findMany({
    orderBy: (t, { asc }) => [asc(t.displayName)],
    with: {
      states: true,
    },
  });
}
