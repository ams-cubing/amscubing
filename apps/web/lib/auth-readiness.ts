import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export async function isAuthDatabaseReady() {
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Database readiness check timed out"));
        }, 1200);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}
