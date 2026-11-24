"use cache";

import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@workspace/db";
import { listBetaGrants } from "@workspace/db/beta-features";

export async function listAdminBetaGrants() {
  cacheLife({ revalidate: 1, stale: 1, expire: 60 });
  cacheTag("beta-feature-grants");
  return listBetaGrants(db);
}
