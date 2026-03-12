import "server-only";

import { db } from "@/db";

export async function getDelegatesWithRegions() {
  return db.query.user.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
    where: (t, { eq }) => eq(t.role, "delegate"),
    with: {
      region: true,
    },
  });
}

export async function getRegionsWithStates() {
  return db.query.regions.findMany({
    orderBy: (t, { asc }) => [asc(t.displayName)],
    with: {
      states: true,
    },
  });
}
