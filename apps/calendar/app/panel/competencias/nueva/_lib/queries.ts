import "server-only";

import { db } from "@workspace/db";
import { hasWcaId } from "@workspace/db/utils";

export async function getDelegates() {
  const rows = await db.query.user.findMany({
    where: (user, { eq }) => eq(user.role, "delegate"),
    orderBy: (user, { asc }) => asc(user.name),
  });
  return rows.filter(hasWcaId);
}
