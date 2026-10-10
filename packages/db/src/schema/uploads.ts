import { type InferSelectModel } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const uploadedFileAppEnum = pgEnum("uploaded_file_app", [
  "blog",
  "boards",
]);

/**
 * Registry of every file stored in UploadThing, keyed by its UploadThing `key`.
 * Lets us find orphaned files (replaced covers, deleted posts/cards) later.
 */
export const uploadedFiles = pgTable(
  "uploaded_file",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    url: text("url").notNull(),
    name: text("name").notNull(),
    app: uploadedFileAppEnum("app").notNull(),
    route: text("route").notNull(),
    uploaderUserId: text("uploader_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("uploaded_file_app_idx").on(table.app),
    index("uploaded_file_uploader_idx").on(table.uploaderUserId),
  ],
);

export type UploadedFile = InferSelectModel<typeof uploadedFiles>;
