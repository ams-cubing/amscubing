import { db } from "@workspace/db";
import { blogPosts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getBlogUrl } from "@workspace/auth/urls";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  const posts = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"));
  return [
    { url: getBlogUrl(), lastModified: new Date() },
    ...posts.map((p) => ({
      url: `${getBlogUrl()}/entradas/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
