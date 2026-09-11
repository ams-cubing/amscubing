import type { MetadataRoute } from "next";

const baseUrl = (
  process.env.NEXT_PUBLIC_WEB_URL ?? "https://amscubing.org"
).replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    "/nosotros",
    "/competencias",
    "/blog",
    "/cursos",
    "/aviso-de-privacidad",
    "/iniciar-sesion",
  ] as const;

  return routes.map((route) => ({
    url: `${baseUrl}${route === "/" ? "" : route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
