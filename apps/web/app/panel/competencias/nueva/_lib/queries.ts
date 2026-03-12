import "server-only";

import { db } from "@/db";

export async function getDelegates() {
  return db.query.user.findMany({
    where: (user, { eq }) => eq(user.role, "delegate"),
    orderBy: (user, { asc }) => asc(user.name),
  });
}
