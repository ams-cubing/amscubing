import "server-only";

import { db } from "@workspace/db";
import { blogComments, blogPosts } from "@workspace/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export const POSTS_PER_PAGE = 12;

export async function listPublishedPosts({
  page,
  q,
  category,
}: {
  page: number;
  q: string;
  category: string;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-posts");

  return db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, "published"),
        q
          ? or(
              ilike(blogPosts.title, `%${q}%`),
              ilike(blogPosts.excerpt, `%${q}%`),
            )
          : undefined,
        category
          ? sql`${blogPosts.categories} @> ${JSON.stringify([category])}::jsonb`
          : undefined,
      ),
    )
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
    .limit(POSTS_PER_PAGE + 1)
    .offset((page - 1) * POSTS_PER_PAGE);
}

export async function listCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-posts");

  const rows = await db
    .select({ categories: blogPosts.categories })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"));
  return [...new Set(rows.flatMap((p) => p.categories))].sort();
}

export async function listPublishedSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-posts");

  return db
    .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"));
}

export async function getPublishedPost(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-posts");

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));
  return post ?? null;
}

export async function getApprovedComments(postId: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(`blog-comments-${postId}`);

  return db
    .select()
    .from(blogComments)
    .where(
      and(eq(blogComments.postId, postId), eq(blogComments.status, "approved")),
    )
    .orderBy(desc(blogComments.createdAt))
    .limit(200);
}
