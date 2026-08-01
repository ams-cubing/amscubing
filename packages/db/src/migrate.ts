import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import "./env";
import { db } from "./index";

export async function runMigrate() {
  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, {
    migrationsFolder: resolve(import.meta.dirname, "../drizzle"),
  });

  const end = Date.now();

  console.log(`✅ Migrations completed in ${end - start}ms`);

  process.exit(0);
}

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
