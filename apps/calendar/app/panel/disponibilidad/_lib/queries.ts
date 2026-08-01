import "server-only";

import { db } from "@workspace/db";
import { user } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getDelegatesForAvailability() {
  return db.query.user.findMany({
    where: eq(user.role, "delegate"),
    columns: {
      wcaId: true,
      name: true,
      regionId: true,
    },
    with: {
      region: {
        columns: {
          displayName: true,
        },
      },
      availability: {
        columns: {
          date: true,
        },
        orderBy: (availability, { asc }) => [asc(availability.date)],
      },
    },
    orderBy: [asc(user.name)],
  });
}
