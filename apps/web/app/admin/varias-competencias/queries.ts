"use cache";

import "server-only";

import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@workspace/db";
import { multiCompetitionOrganizers, user } from "@workspace/db/schema";

export async function listMultiCompetitionOrganizers() {
  cacheLife({ revalidate: 1, stale: 1, expire: 60 });
  cacheTag("multi-competition-organizers");

  const grantedBy = alias(user, "granted_by");

  return db
    .select({
      userId: multiCompetitionOrganizers.userId,
      createdAt: multiCompetitionOrganizers.createdAt,
      name: user.name,
      email: user.email,
      wcaId: user.wcaId,
      image: user.image,
      grantedByName: grantedBy.name,
    })
    .from(multiCompetitionOrganizers)
    .innerJoin(user, eq(user.id, multiCompetitionOrganizers.userId))
    .leftJoin(
      grantedBy,
      eq(grantedBy.id, multiCompetitionOrganizers.grantedByUserId),
    )
    .orderBy(asc(user.name));
}
