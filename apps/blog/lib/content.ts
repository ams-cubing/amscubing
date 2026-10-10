import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import type { BlogSection } from "@workspace/db/schema";

export const brandColors = {
  white: "#ffffff",
  soft: "#f4f4f4",
  navy: "#010b19",
  red: "#ba0c2f",
  green: "#009a44",
  orange: "#fe5000",
} as const;
export function safeUrl(value: string, image = false) {
  if (!image && value === "/competencias") return value;
  if (!image && /^\/entradas\/[a-z0-9-]+$/.test(value)) return value;
  if (
    image &&
    /^\/media\/[a-zA-Z0-9_./-]+$/.test(value) &&
    !value.includes("..")
  )
    return value;
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.toString() : "";
  } catch {
    return "";
  }
}
export function cleanHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "figure",
      "figcaption",
      "img",
      "iframe",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "hr",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "loading"],
      iframe: ["src", "title", "allowfullscreen"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    allowedIframeHostnames: [
      "www.youtube.com",
      "www.youtube-nocookie.com",
      "player.vimeo.com",
    ],
    transformTags: {
      a: (_tag, attrs) => ({
        tagName: "a",
        attribs: {
          href: safeUrl(attrs.href ?? ""),
          rel: "noopener noreferrer",
        },
      }),
      img: (_tag, attrs) => ({
        tagName: "img",
        attribs: {
          src: safeUrl(attrs.src ?? "", true),
          alt: attrs.alt ?? "",
          loading: "lazy",
        },
      }),
    },
  });
}
export function plainText(value: string) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
const blockSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.enum([
      "heading",
      "text",
      "image",
      "quote",
      "video",
      "button",
      "divider",
      "html",
    ]),
    text: z.string().max(100000),
    url: z.string().max(2000).optional(),
    caption: z.string().max(500).optional(),
    level: z.union([z.literal(2), z.literal(3)]).optional(),
  })
  .strict();
export const sectionsSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(100),
        background: z.enum(["white", "soft", "navy", "red", "green", "orange"]),
        columns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        blocks: z.array(blockSchema).max(100),
      })
      .strict(),
  )
  .max(60);
export function validateSections(input: unknown): BlogSection[] {
  const sections = sectionsSchema.parse(input);
  const ids = new Set<string>();
  for (const s of sections) {
    if (ids.has(s.id)) throw new Error("Secciones duplicadas");
    ids.add(s.id);
    for (const b of s.blocks) {
      if (ids.has(b.id)) throw new Error("Bloques duplicados");
      ids.add(b.id);
      b.text = b.type === "html" ? cleanHtml(b.text) : plainText(b.text);
      if (b.url) {
        const safe = safeUrl(b.url, b.type === "image");
        if (!safe) throw new Error("URL no permitida");
        b.url = safe;
      }
      if (["image", "video", "button"].includes(b.type) && !b.url)
        throw new Error("Falta un enlace del bloque");
      if (b.type === "video" && !videoEmbed(b.url!))
        throw new Error("Usa un enlace de YouTube o Vimeo");
    }
  }
  return sections;
}
export function videoEmbed(value: string) {
  try {
    const url = new URL(value);
    let id: string | null = null;
    if (
      ["youtube.com", "www.youtube.com", "www.youtube-nocookie.com"].includes(
        url.hostname,
      )
    )
      id =
        url.searchParams.get("v") ||
        (/^\/(?:embed|shorts)\/([\w-]+)/.exec(url.pathname)?.[1] ?? null);
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    if (id && /^[\w-]+$/.test(id))
      return `https://www.youtube-nocookie.com/embed/${id}`;
    if (["vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
      const match = /(?:^\/|\/video\/)(\d+)/.exec(url.pathname);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
}
