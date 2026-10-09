import { load } from "cheerio";
import type { BlogSection, BlogBlock } from "@workspace/db/schema";
import { cleanHtml, plainText } from "./content";
export function convertWordpress(html: string, id: number): BlogSection[] {
  const $ = load(html);
  $(
    "script,style,form,button,nav,.sharedaddy,.elementor-widget-share-buttons",
  ).remove();
  let sequence = 0;
  const sections: BlogSection[] = [];
  let current: BlogSection = {
    id: `wp-${id}-s0`,
    background: "white",
    columns: 1,
    blocks: [],
  };
  sections.push(current);
  const selector =
    "h1,h2,h3,h4,summary,p,ul,ol,blockquote,figure,iframe,table,img,a.wp-block-button__link";
  $(selector).each((_i, element) => {
    if ($(element).parents(selector).length) return;
    const node = $(element);
    const tag = element.tagName;
    const text = plainText(node.html() ?? "");
    const blockId = `wp-${id}-b${++sequence}`;
    let block: BlogBlock;
    if (tag === "figure" && node.hasClass("wp-block-gallery")) {
      const gallery: BlogSection = {
        id: `wp-${id}-s${sections.length}`,
        background: "soft",
        columns: 3,
        blocks: [],
      };
      node.find("img").each((_j, img) => {
        const image = $(img);
        gallery.blocks.push({
          id: `wp-${id}-b${++sequence}`,
          type: "image",
          text: image.attr("alt") ?? "",
          url: image.attr("src") ?? "",
          caption: plainText(
            image.closest("figure").find("figcaption").first().html() ?? "",
          ),
        });
      });
      if (gallery.blocks.length) sections.push(gallery);
      current = {
        id: `wp-${id}-s${sections.length}`,
        background: "white",
        columns: 1,
        blocks: [],
      };
      sections.push(current);
      return;
    }
    if (["h1", "h2", "summary"].includes(tag)) {
      if (current.blocks.length) {
        current = {
          id: `wp-${id}-s${sections.length}`,
          background: sections.length % 3 === 2 ? "soft" : "white",
          columns: 1,
          blocks: [],
        };
        sections.push(current);
      }
      block = { id: blockId, type: "heading", text, level: 2 };
    } else if (tag === "a")
      block = {
        id: blockId,
        type: "button",
        text,
        url: node.attr("href") ?? "",
      };
    else if (["h3", "h4"].includes(tag))
      block = { id: blockId, type: "heading", text, level: 3 };
    else if (tag === "img")
      block = {
        id: blockId,
        type: "image",
        text: node.attr("alt") ?? "",
        url: node.attr("src") ?? node.attr("data-src") ?? "",
      };
    else if (tag === "blockquote") block = { id: blockId, type: "quote", text };
    else
      block = { id: blockId, type: "html", text: cleanHtml($.html(element)) };
    if (block.text || block.type === "image") current.blocks.push(block);
  });
  if (!sections.some((s) => s.blocks.length))
    current.blocks = [
      { id: `wp-${id}-fallback`, type: "html", text: cleanHtml(html) },
    ];
  return sections.filter((s) => s.blocks.length);
}
