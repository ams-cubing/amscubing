import { connection } from "next/server";
import { getBlogUrl } from "@workspace/auth/urls";
import { listPublishedSlugs } from "@/lib/posts";
export default async function sitemap() {
  await connection();
  const posts = await listPublishedSlugs();
  const latest = posts.reduce<Date | undefined>(
    (max, p) => (!max || p.updatedAt > max ? p.updatedAt : max),
    undefined,
  );
  return [
    { url: getBlogUrl(), lastModified: latest },
    ...posts.map((p) => ({
      url: `${getBlogUrl()}/entradas/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
