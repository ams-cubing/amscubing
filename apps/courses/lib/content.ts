import sanitize from "sanitize-html";

export function cleanHtml(value: string) {
  return sanitize(value, {
    allowedTags: [
      ...sanitize.defaults.allowedTags,
      "img",
      "iframe",
      "video",
      "source",
    ],
    allowedAttributes: {
      ...sanitize.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "title", "allowfullscreen"],
      video: ["src", "controls", "poster"],
      source: ["src", "type"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedIframeHostnames: [
      "www.youtube.com",
      "www.youtube-nocookie.com",
      "player.vimeo.com",
    ],
    allowProtocolRelative: false,
  });
}

export function safeUrl(value: string) {
  if (!value.trim()) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
