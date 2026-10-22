import type { MetadataRoute } from "next";
import { getCoursesUrl } from "@workspace/auth/urls";
import { AI_CRAWLERS } from "@workspace/server/robots";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/mis-cursos",
          "/cursos/*/lecciones",
          "/cursos/*/certificado",
        ],
      },
      { userAgent: AI_CRAWLERS, disallow: "/" },
    ],
    sitemap: `${getCoursesUrl()}/sitemap.xml`,
  };
}
