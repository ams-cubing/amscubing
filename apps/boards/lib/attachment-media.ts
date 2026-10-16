const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
]);

/** True when the URL pathname ends with a common image extension. */
export function isImageAttachmentUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url.trim());
    const lastSegment = pathname.split("/").pop() ?? "";
    const dot = lastSegment.lastIndexOf(".");
    if (dot < 0) return false;
    const ext = lastSegment.slice(dot + 1).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}
