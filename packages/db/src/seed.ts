import { sql } from "drizzle-orm";

import "./env";
import { MEXICO_REGIONS } from "./data/mexico";
import { db } from "./index";
import { regions, states } from "./schema";
import { seedAmsBoardTemplate } from "./seed-board-template";

export async function runSeed() {
  console.log("⏳ Seeding regions and states...");

  const start = Date.now();

  await db
    .insert(regions)
    .values(
      MEXICO_REGIONS.map((region) => ({
        id: region.id,
        displayName: region.displayName,
        mapColor: region.mapColor,
      })),
    )
    .onConflictDoUpdate({
      target: regions.id,
      set: {
        displayName: sql`excluded.display_name`,
        mapColor: sql`excluded.map_color`,
      },
    });

  await db
    .insert(states)
    .values(
      MEXICO_REGIONS.flatMap((region) =>
        region.states.map((state) => ({
          id: state.id,
          name: state.name,
          regionId: region.id,
        })),
      ),
    )
    .onConflictDoUpdate({
      target: states.id,
      set: {
        name: sql`excluded.name`,
        regionId: sql`excluded.region_id`,
      },
    });

  console.log(
    `✅ Seeded ${MEXICO_REGIONS.length} regions and ${MEXICO_REGIONS.reduce((count, region) => count + region.states.length, 0)} states`,
  );

  await seedAmsBoardTemplate();

  const end = Date.now();
  console.log(`✅ Seed completed in ${end - start}ms`);

  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seed failed");
  console.error(err);
  process.exit(1);
});
