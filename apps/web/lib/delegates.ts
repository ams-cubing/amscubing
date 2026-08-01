import "server-only";

import { db } from "@workspace/db";
import type { PublicDelegate } from "./delegate-types";

export type { PublicDelegate };

export async function getPublicDelegates(): Promise<PublicDelegate[]> {
  const rows = await db.query.user.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
    where: (t, { eq }) => eq(t.role, "delegate"),
    columns: {
      name: true,
      wcaId: true,
      delegateTitle: true,
      delegateLocation: true,
    },
    with: {
      region: {
        columns: {
          displayName: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    name: row.name,
    wcaId: row.wcaId,
    title: row.delegateTitle ?? "Delegado",
    location: row.delegateLocation ?? row.region?.displayName ?? "México",
  }));
}
