import { describe, expect, it } from "vitest";
import { extractFirstImageUrl } from "./competition-logo";

describe("extractFirstImageUrl", () => {
  it("returns null for empty information", () => {
    expect(extractFirstImageUrl(null)).toBeNull();
    expect(extractFirstImageUrl(undefined)).toBeNull();
    expect(extractFirstImageUrl("")).toBeNull();
    expect(extractFirstImageUrl("No images here")).toBeNull();
  });

  it("extracts the first markdown image URL", () => {
    const information = [
      "Welcome to the competition.",
      "",
      "![Logo](https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/abc/logo.png)",
      "",
      "![Venue](https://example.com/venue.jpg)",
    ].join("\n");

    expect(extractFirstImageUrl(information)).toBe(
      "https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/abc/logo.png",
    );
  });

  it("handles nested parentheses in the filename", () => {
    const information =
      "![alt](https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/tok/logo-08 (1).png)";

    expect(extractFirstImageUrl(information)).toBe(
      "https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/tok/logo-08 (1).png",
    );
  });
});
