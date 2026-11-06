const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif"]);

function hasImageExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return false;
  return IMAGE_EXTENSIONS.has(fileName.slice(dot + 1).toLowerCase());
}

/** True when the URL pathname ends with a common image extension. */
export function isImageAttachmentUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url.trim());
    return hasImageExtension(pathname.split("/").pop() ?? "");
  } catch {
    return false;
  }
}

/**
 * UploadThing URLs (`…ufs.sh/f/<key>`) carry no extension, so the uploaded
 * file name is checked too.
 */
export function isImageAttachment(attachment: { name: string; url: string }) {
  return (
    isImageAttachmentUrl(attachment.url) ||
    (/^https?:\/\//i.test(attachment.url.trim()) &&
      hasImageExtension(attachment.name.trim()))
  );
}
