import { db } from "@workspace/db";
import { blogRateLimits } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
export async function consumeLimit(key: string, max: number, seconds: number) {
  const [row] = await db
    .insert(blogRateLimits)
    .values({ key, count: 1, resetsAt: new Date(Date.now() + seconds * 1000) })
    .onConflictDoUpdate({
      target: blogRateLimits.key,
      set: {
        count: sql`case when ${blogRateLimits.resetsAt} <= now() then 1 else ${blogRateLimits.count} + 1 end`,
        resetsAt: sql`case when ${blogRateLimits.resetsAt} <= now() then excluded.resets_at else ${blogRateLimits.resetsAt} end`,
      },
    })
    .returning();
  return Boolean(row && row.count <= max);
}
