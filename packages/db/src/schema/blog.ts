import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  check,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export type BrandColor = "white" | "soft" | "navy" | "red" | "green" | "orange";
export type BlogBlock = {
  id: string;
  type:
    | "heading"
    | "text"
    | "image"
    | "quote"
    | "video"
    | "button"
    | "divider"
    | "html";
  text: string;
  url?: string;
  caption?: string;
  level?: 2 | 3;
};
export type BlogSection = {
  id: string;
  background: BrandColor;
  columns: 1 | 2 | 3;
  blocks: BlogBlock[];
};

export const blogStaff = pgTable(
  "blog_staff",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["administrator", "developer", "editor"],
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    check(
      "blog_staff_role_check",
      sql`${t.role} in ('administrator','developer','editor')`,
    ),
  ],
);

export const blogPosts = pgTable(
  "blog_post",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    coverUrl: text("cover_url"),
    sections: jsonb("sections").$type<BlogSection[]>().notNull().default([]),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    commentsEnabled: boolean("comments_enabled").notNull().default(true),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull().default("Equipo AMS"),
    legacyId: integer("legacy_id").unique(),
    sourceUrl: text("source_url"),
    revision: integer("revision").notNull().default(1),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "blog_post_status_check",
      sql`${t.status} in ('draft','published','archived')`,
    ),
    index("blog_post_public_idx").on(t.status, t.publishedAt),
  ],
);

export const blogComments = pgTable(
  "blog_comment",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    content: text("content").notNull(),
    status: text("status", { enum: ["pending", "approved", "hidden"] })
      .notNull()
      .default("pending"),
    legacyId: integer("legacy_id").unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "blog_comment_status_check",
      sql`${t.status} in ('pending','approved','hidden')`,
    ),
    index("blog_comment_post_idx").on(t.postId, t.status),
  ],
);

// Atomic PostgreSQL counters shared across processes, used for comments and uploads.
export const blogRateLimits = pgTable("blog_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetsAt: timestamp("resets_at").notNull(),
});
