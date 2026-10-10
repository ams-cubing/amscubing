import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "./index";

export type RateLimitOptions = {
  /** Must be namespaced (e.g. `calendar:date-request:user:<id>`) to avoid clashing with Better Auth keys. */
  key: string;
  windowMs: number;
  max: number;
  now?: number;
};

export type RateLimitResult = { allowed: boolean; count: number };

type Executor = Pick<typeof db, "execute">;

/**
 * Fixed-window counter on Better Auth's `rate_limit` table. For keys owned by this
 * helper, `last_request` stores the window start rather than the last hit.
 */
export async function consumeRateLimit(
  { key, windowMs, max, now = Date.now() }: RateLimitOptions,
  executor: Executor = db,
): Promise<RateLimitResult> {
  const expiredBefore = now - windowMs;
  const rows = await executor.execute<{ count: number }>(sql`
    insert into rate_limit (id, key, count, last_request)
    values (${randomUUID()}, ${key}, 1, ${now})
    on conflict (key) do update set
      count = case
        when rate_limit.last_request <= ${expiredBefore} then 1
        else rate_limit.count + 1
      end,
      last_request = case
        when rate_limit.last_request <= ${expiredBefore} then ${now}
        else rate_limit.last_request
      end
    returning count
  `);
  const count = Number(rows[0]?.count ?? 1);
  return { allowed: count <= max, count };
}
