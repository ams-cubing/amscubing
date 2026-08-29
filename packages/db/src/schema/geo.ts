import { InferSelectModel } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";

export const regions = pgTable("region", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  mapColor: text("map_color").notNull(),
});

export type Region = InferSelectModel<typeof regions>;

export const states = pgTable("state", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  regionId: text("region_id")
    .notNull()
    .references(() => regions.id),
});

export type State = InferSelectModel<typeof states>;
