import type { MetadataRoute } from "next";
import { getBlogUrl } from "@workspace/auth/urls";
import { AI_CRAWLERS } from "@workspace/server/robots";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
      { userAgent: AI_CRAWLERS, disallow: "/" },
    ],
    sitemap: `${getBlogUrl()}/sitemap.xml`,
  };
}
