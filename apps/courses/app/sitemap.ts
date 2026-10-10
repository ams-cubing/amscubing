import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getCoursesUrl } from "@workspace/auth/urls";
import { getCatalog } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const baseUrl = getCoursesUrl();
  const catalog = await getCatalog();
  const latest = catalog.reduce<Date | undefined>(
    (max, { course }) =>
      !max || course.updatedAt > max ? course.updatedAt : max,
    undefined,
  );

  return [
    { url: baseUrl, lastModified: latest },
    ...catalog.map(({ course }) => ({
      url: `${baseUrl}/cursos/${course.slug}`,
      lastModified: course.updatedAt,
    })),
  ];
}
