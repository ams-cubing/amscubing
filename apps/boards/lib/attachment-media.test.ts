import { describe, expect, it } from "vitest";

import { isImageAttachmentUrl } from "./attachment-media";

describe("isImageAttachmentUrl", () => {
  it("accepts common image extensions", () => {
    expect(isImageAttachmentUrl("https://utfs.io/f/flyer.png")).toBe(true);
    expect(isImageAttachmentUrl("https://example.com/a/b.JPEG")).toBe(true);
    expect(isImageAttachmentUrl("https://cdn.example/x.webp?v=1")).toBe(true);
  });

  it("rejects non-image urls", () => {
    expect(isImageAttachmentUrl("https://utfs.io/f/doc.pdf")).toBe(false);
    expect(isImageAttachmentUrl("https://example.com/noext")).toBe(false);
    expect(isImageAttachmentUrl("not-a-url")).toBe(false);
  });
});
