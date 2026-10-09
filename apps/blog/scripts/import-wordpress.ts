import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { blogPosts, blogComments } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { load } from "cheerio";
import { convertWordpress } from "../lib/wordpress";
import { plainText, safeUrl, validateSections } from "../lib/content";
const directory = resolve(process.argv[2] ?? "../../.codex/migration/blog");
const read = (name: string) =>
  JSON.parse(readFileSync(resolve(directory, name), "utf8"));
type WPPost = {
  id: number;
  slug: string;
  date_gmt: string;
  modified_gmt: string;
  link: string;
  status: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  categories: number[];
  tags: number[];
  comment_status: string;
  _embedded?: {
    "wp:featuredmedia"?: { source_url: string }[];
    author?: { name: string }[];
  };
};
const posts = read("posts.json") as WPPost[];
const categories = read("categories.json") as { id: number; name: string }[];
const comments = read("comments.json") as {
  id: number;
  post: number;
  author_name: string;
  date_gmt: string;
  content: { rendered: string };
}[];
const mediaDir = resolve("public/media/wordpress");
mkdirSync(mediaDir, { recursive: true });
const map: Record<string, string> = existsSync(
  resolve(directory, "media-map.json"),
)
  ? read("media-map.json")
  : {};
async function media(source: string) {
  if (map[source]) return map[source]!;
  const url = new URL(source);
  if (
    !["amscubing.org", "www.amscubing.org", "old.amscubing.org"].includes(
      url.hostname,
    ) ||
    !url.pathname.includes("/wp-content/uploads/")
  )
    return source;
  const ext = extname(url.pathname).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return source;
  const name =
    createHash("sha256").update(source).digest("hex").slice(0, 20) + ext;
  const dest = resolve(mediaDir, name);
  if (!existsSync(dest)) {
    url.hostname = "old.amscubing.org";
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`No se pudo copiar un medio (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 25 * 1024 * 1024)
      throw new Error("Medio mayor de 25 MB");
    writeFileSync(dest, bytes);
  }
  map[source] = `/media/wordpress/${name}`;
  return map[source]!;
}
let imported = 0;
for (const post of posts) {
  if (post.status !== "publish") continue;
  const $ = load(post.content.rendered);
  const sources = new Set<string>();
  $("img").each((_i, el) => {
    const u = $(el).attr("src") || $(el).attr("data-src");
    if (u && safeUrl(u)) sources.add(u);
  });
  const cover =
    post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ??
    [...sources][0] ??
    null;
  if (cover) sources.add(cover);
  for (const source of sources) await media(source);
  $("img").each((_i, el) => {
    const node = $(el);
    const src = node.attr("src") || node.attr("data-src");
    if (src) node.attr("src", map[src] ?? src);
    node.removeAttr("srcset").removeAttr("sizes");
  });
  $("a").each((_i, el) => {
    const href = $(el).attr("href");
    const linked = posts.find((p) => p.link === href);
    if (linked) $(el).attr("href", `/entradas/${linked.slug}`);
    if ($(el).text().trim() === "Próximas competencias")
      $(el).attr("href", "/competencias");
  });
  const sections = validateSections(convertWordpress($.html(), post.id));
  const first = sections[0]?.blocks[0];
  if (
    first?.type === "html" &&
    cover &&
    first.text.includes(map[cover] ?? cover) &&
    !first.text.includes("figcaption")
  )
    sections[0]!.blocks.shift();
  const excerpts: Record<string, string> = {
    "preparandome-para-mi-primera-competencia-oficial":
      "Todo lo que necesitas saber para disfrutar tu primera competencia oficial: preparación, registro y qué esperar el día del evento.",
    "50-anos-del-cubo-rubik":
      "Medio siglo de un rompecabezas que transformó la manera de jugar, aprender y compartir. Conoce la historia del cubo de Rubik.",
    speedcubingmexico:
      "Resolver, aprender y compartir: conoce el speedcubing y a la comunidad que lo impulsa en México.",
  };
  const data = {
    slug: post.slug,
    title: plainText(post.title.rendered),
    excerpt:
      excerpts[post.slug] ??
      plainText(post.excerpt.rendered).replace(/\[.*?\]$/, ""),
    coverUrl: cover ? (map[cover] ?? cover) : null,
    sections,
    categories: post.categories
      .map((id) => plainText(categories.find((c) => c.id === id)?.name ?? ""))
      .filter(Boolean),
    tags: [],
    status: "published" as const,
    commentsEnabled: true,
    authorName:
      post._embedded?.author?.[0]?.name === "amscubing.org"
        ? "Equipo AMS"
        : (post._embedded?.author?.[0]?.name ?? "Equipo AMS"),
    sourceUrl: post.link,
    publishedAt: new Date(`${post.date_gmt}Z`),
    updatedAt: new Date(`${post.modified_gmt}Z`),
  };
  const [existing] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.legacyId, post.id));
  // Imported entries become locally owned after the first editorial save.
  if (existing && existing.revision > 1) continue;
  await db.transaction(async (tx) => {
    const [saved] = await tx
      .insert(blogPosts)
      .values({ ...data, legacyId: post.id, createdAt: data.publishedAt })
      .onConflictDoUpdate({ target: blogPosts.legacyId, set: data })
      .returning();
    for (const comment of comments.filter((c) => c.post === post.id)) {
      const values = {
        postId: saved!.id,
        authorName: plainText(comment.author_name),
        content: plainText(comment.content.rendered),
        status: "approved" as const,
        createdAt: new Date(`${comment.date_gmt}Z`),
      };
      await tx
        .insert(blogComments)
        .values({ ...values, legacyId: comment.id })
        .onConflictDoNothing({ target: blogComments.legacyId });
    }
  });
  imported++;
}
writeFileSync(
  resolve(directory, "media-map.json"),
  JSON.stringify(map, null, 2),
);
const summary = {
  publishedPosts: posts.length,
  imported,
  publicComments: comments.length,
  localMedia: Object.keys(map).length,
};
writeFileSync(
  resolve(directory, "import-summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
