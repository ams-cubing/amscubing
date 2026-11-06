import { describe, expect, it } from "vitest";

import { isImageAttachment, isImageAttachmentUrl } from "./attachment-media";

describe("isImageAttachment", () => {
  it("uses the file name when the URL has no extension", () => {
    expect(
      isImageAttachment({
        name: "plano_tecnico.png",
        url: "https://abc123.ufs.sh/f/Xyz789",
      }),
    ).toBe(true);
    expect(
      isImageAttachment({
        name: "Recibo.pdf",
        url: "https://abc123.ufs.sh/f/Xyz789",
      }),
    ).toBe(false);
    expect(isImageAttachment({ name: "foto.png", url: "not-a-url" })).toBe(
      false,
    );
  });
});

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
