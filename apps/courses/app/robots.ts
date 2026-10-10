import type { MetadataRoute } from "next";
import { getCoursesUrl } from "@workspace/auth/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/mis-cursos",
        "/cursos/*/lecciones",
        "/cursos/*/certificado",
      ],
    },
    sitemap: `${getCoursesUrl()}/sitemap.xml`,
  };
}
