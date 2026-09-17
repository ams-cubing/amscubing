import { describe, expect, it } from "vitest";
import { extractFirstImageUrl } from "./competition-logo";
import {
  extractWcaCompetitionId,
  normalizeWcaCompetitionUrl,
} from "./wca-competition";
import { buildAnnouncementCaption, facebookPostUrl } from "./meta-publish";

describe("extractFirstImageUrl", () => {
  it("extracts the first markdown image URL", () => {
    const information =
      "Hello\n![Logo](https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/abc/logo.png)\nMore text";
    expect(extractFirstImageUrl(information)).toBe(
      "https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/abc/logo.png",
    );
  });

  it("handles parentheses in filenames", () => {
    const information =
      "![alt](https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/tok/logo-08 (1).png)";
    expect(extractFirstImageUrl(information)).toBe(
      "https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/tok/logo-08 (1).png",
    );
  });

  it("returns null when there is no image", () => {
    expect(extractFirstImageUrl("No logo here")).toBeNull();
  });
});

describe("wca competition URL helpers", () => {
  it("extracts competition id from URL", () => {
    expect(
      extractWcaCompetitionId(
        "https://www.worldcubeassociation.org/competitions/MexicoCityOpen2026",
      ),
    ).toBe("MexicoCityOpen2026");
  });

  it("normalizes competition URLs", () => {
    expect(
      normalizeWcaCompetitionUrl(
        "https://www.worldcubeassociation.org/competitions/MexicoCityOpen2026/edit",
      ),
    ).toBe(
      "https://www.worldcubeassociation.org/competitions/MexicoCityOpen2026",
    );
  });
});

describe("buildAnnouncementCaption", () => {
  it("includes name, city, dates and WCA URL", () => {
    const caption = buildAnnouncementCaption({
      name: "Test Open 2026",
      city: "CDMX",
      startDate: "2026-10-01",
      endDate: "2026-10-02",
      wcaUrl: "https://www.worldcubeassociation.org/competitions/TestOpen2026",
    });

    expect(caption).toContain("Test Open 2026");
    expect(caption).toContain("CDMX");
    expect(caption).toContain(
      "https://www.worldcubeassociation.org/competitions/TestOpen2026",
    );
    expect(caption).toContain("#TorneoDeRubik");
  });
});

describe("facebookPostUrl", () => {
  it("builds a facebook.com URL from a post id", () => {
    expect(facebookPostUrl("123_456")).toBe("https://www.facebook.com/123_456");
  });
});
