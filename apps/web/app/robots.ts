import type { MetadataRoute } from "next";

const baseUrl = (
  process.env.NEXT_PUBLIC_WEB_URL ?? "https://amscubing.org"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/cuenta"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
