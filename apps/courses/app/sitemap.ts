import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { courses } from "@workspace/db/schema";
import { connection } from "next/server";
import { getCoursesUrl } from "@workspace/auth/urls";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const baseUrl = getCoursesUrl();
  const published = await db
    .select({ slug: courses.slug, updatedAt: courses.updatedAt })
    .from(courses)
    .where(eq(courses.status, "published"));

  return [
    { url: baseUrl, lastModified: new Date() },
    ...published.map((course) => ({
      url: `${baseUrl}/cursos/${course.slug}`,
      lastModified: course.updatedAt,
    })),
  ];
}
