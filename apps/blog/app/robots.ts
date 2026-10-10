import type { MetadataRoute } from "next";
import { getBlogUrl } from "@workspace/auth/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${getBlogUrl()}/sitemap.xml`,
  };
}
