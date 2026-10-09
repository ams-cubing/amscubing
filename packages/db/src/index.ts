import "./env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Next.js reloads modules during development; reuse the pool to avoid exhausting
// PostgreSQL connections when several AMS apps run together.
const shared = globalThis as typeof globalThis & {
  amsSql?: ReturnType<typeof postgres>;
};
const client = shared.amsSql ?? postgres(process.env.DATABASE_URL!, { max: 5 });
if (process.env.NODE_ENV !== "production") shared.amsSql = client;
export const db = drizzle(client, { schema });
