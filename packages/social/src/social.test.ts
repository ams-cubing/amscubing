import { describe, expect, it } from "vitest";
import { extractFirstImageUrl } from "./competition-logo";
import {
  extractWcaCompetitionId,
  normalizeWcaCompetitionUrl,
} from "./wca-competition";
import { buildAnnouncementCaption, facebookPostUrl } from "./meta-publish";
import { formatEventLabels } from "./format";

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
  it("builds a Torneo de Rubik style caption with custom body and events", () => {
    const caption = buildAnnouncementCaption({
      name: "Mega-Mente Puebla 2026",
      city: "Puebla",
      stateName: "Puebla",
      startDate: "2026-09-26",
      endDate: "2026-09-27",
      wcaUrl:
        "https://www.worldcubeassociation.org/competitions/MegaMentePuebla2026",
      customText:
        "Hay desafíos que no se vencen solo con velocidad.\n¡BIENVENIDOS prep!",
      tags: "@rubik_teampuebla Puebla Rubik's Team",
      venueName: "Comité Directivo Estatal del PRI de Puebla",
      eventIds: ["333", "222", "777", "333bf", "minx", "sq1"],
      competitorLimit: 70,
    });

    expect(caption).toContain("Hay desafíos que no se vencen solo con velocidad.");
    expect(caption).toContain("¡BIENVENIDOS A MEGA-MENTE PUEBLA 2026!");
    expect(caption).toContain("📅:");
    expect(caption).toContain("📍: Comité Directivo Estatal del PRI de Puebla");
    expect(caption).toContain("🏙️: Puebla, Puebla");
    expect(caption).toContain("🔻: 3x3, 2x2, 7x7, 3BLD, Megaminx, Square-1");
    expect(caption).toContain("🎟️: 70 competidores");
    expect(caption).toContain("ℹ️: @rubik_teampuebla Puebla Rubik's Team");
    expect(caption).toContain(
      "https://www.worldcubeassociation.org/competitions/MegaMentePuebla2026",
    );
  });
});

describe("formatEventLabels", () => {
  it("maps known event ids", () => {
    expect(formatEventLabels(["333", "minx"])).toBe("3x3, Megaminx");
  });
});

describe("facebookPostUrl", () => {
  it("builds a facebook.com URL from a post id", () => {
    expect(facebookPostUrl("123_456")).toBe("https://www.facebook.com/123_456");
  });
});
