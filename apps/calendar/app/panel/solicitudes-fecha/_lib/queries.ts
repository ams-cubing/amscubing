import "server-only";

import { db } from "@workspace/db";
import { dateRequests } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function getOpenDateRequestsForDelegate(wcaId: string) {
  return db.query.dateRequests.findMany({
    where: and(
      eq(dateRequests.status, "open"),
      eq(dateRequests.proposedDelegateWcaId, wcaId),
    ),
    with: {
      state: {
        with: { region: true },
      },
      requester: {
        columns: { name: true, wcaId: true, email: true },
      },
    },
    orderBy: [desc(dateRequests.createdAt)],
  });
}

export async function getDateRequestById(id: number) {
  return db.query.dateRequests.findFirst({
    where: eq(dateRequests.id, id),
    with: {
      state: {
        with: { region: true },
      },
      requester: {
        columns: { name: true, wcaId: true, email: true, image: true },
      },
      proposedDelegate: {
        columns: { name: true, wcaId: true, email: true, image: true },
      },
      competition: {
        columns: { id: true, name: true },
      },
    },
  });
}
