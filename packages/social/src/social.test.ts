import { describe, expect, it } from "vitest";
import { extractFirstImageUrl } from "./competition-logo";
import { extractSpanishIntroFromInformation } from "./competition-information";
import {
  extractWcaCompetitionId,
  normalizeWcaCompetitionUrl,
} from "./wca-competition";
import { buildAnnouncementCaption, facebookPostUrl } from "./meta-publish";
import { resolveAnnouncementBodyText } from "./announce-and-publish";
import {
  formatCoverDateRange,
  formatCoverRegistrationRange,
  formatEventLabels,
  formatPlaceLine,
} from "./format";
import {
  COVER_MAX_SLOTS,
  generateCoverPngFromInputs,
  selectCoverCompetitions,
} from "./cover-image";

const UPEN_INFORMATION =
  "![](https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTYyNzIzLCJwdXIiOiJibG9iX2lkIn19--bf638126f96e668f65b37e3ce68edb80c6d49543/upen%20(1).png) ###### Español ¡Bienvenidos al UPEN Open 2026, otra competencia en el hermoso estado de Nayarit!. Este evento emocionante y lleno de velocidad se llevará a cabo en la ciudad de Tepic los días sábado 16 y domingo 17 de mayo de 2026. El UPEN Open 2026 reunirá a cuberos de todo el estado de Nayarit y más allá, brindándoles la oportunidad de mostrar su destreza y competir en una variedad de eventos. Tanto si eres un principiante como un profesional experimentado, este torneo ofrece una oportunidad para que todos participen y se diviertan. Esta competencia es reconocida como una competencia oficial de la Asociación Mundial del Cubo. Por lo tanto, todos los competidores deben estar familiarizados y entender el[ reglamento de la WCA](https://www.worldcubeassociation.org/regulations/translations/spanish-american/) antes de la competencia. **AVISO DE FILMACIÓN Y FOTOGRAFÍA** En este evento se tomarán fotografías y videos que podrán ser usados por la [Asociación Mexicana de Speedcubing](https://amscubing.org/) con fines de promoción, documentación y difusión de nuestras actividades. Al asistir, autorizas el uso de tu imagen en los términos de nuestro Aviso de Privacidad. 📄 Consúltalo aquí 👉 www.amscubing.org/privacidad/ ###### English Welcome to UPEN Open 2026, another competition in the beautiful state of Nayarit! This exciting and high-speed event will take place in the city of Tepic on Saturday, May 16, and Sunday, May 17, 2026. UPEN Open 2026 will bring together cubers from across the state of Nayarit and beyond, providing them with the opportunity to showcase their skills and compete in a variety of events. Whether you are a beginner or an experienced professional, this tournament offers a chance for everyone to participate and have fun. This competition is recognized as an official event by the World Cube Association. Therefore, all competitors must be familiar with and understand the[ WCA regulations](https://www.worldcubeassociation.org/regulations/) before the competition. **NOTICE OF FILMING AND PHOTOGRAPHY** Photos and videos will be taken at this event, which may be used by [Asociación Mexicana de Speedcubing](https://amscubing.org/) for promotion, documentation, and dissemination of our activities. By attending, you authorize the use of your image under the terms of our Privacy Notice. 📄 Check it here 👉 www.amscubing.org/privacidad/";

describe("extractSpanishIntroFromInformation", () => {
  it("extracts the Spanish welcome intro from bilingual AMS information", () => {
    expect(extractSpanishIntroFromInformation(UPEN_INFORMATION)).toBe(
      "¡Bienvenidos al UPEN Open 2026, otra competencia en el hermoso estado de Nayarit!. Este evento emocionante y lleno de velocidad se llevará a cabo en la ciudad de Tepic los días sábado 16 y domingo 17 de mayo de 2026. El UPEN Open 2026 reunirá a cuberos de todo el estado de Nayarit y más allá, brindándoles la oportunidad de mostrar su destreza y competir en una variedad de eventos. Tanto si eres un principiante como un profesional experimentado, este torneo ofrece una oportunidad para que todos participen y se diviertan.",
    );
  });

  it("returns null for empty information", () => {
    expect(extractSpanishIntroFromInformation(null)).toBeNull();
    expect(extractSpanishIntroFromInformation("   ")).toBeNull();
  });

  it("strips images and uses full text when language headings are missing", () => {
    const information =
      "![logo](https://example.com/a.png) Bienvenidos al Open. Diversión garantizada.";
    expect(extractSpanishIntroFromInformation(information)).toBe(
      "Bienvenidos al Open. Diversión garantizada.",
    );
  });
});

describe("resolveAnnouncementBodyText", () => {
  it("prefers custom text over WCA information", () => {
    expect(
      resolveAnnouncementBodyText("  Copy propio  ", UPEN_INFORMATION),
    ).toBe("Copy propio");
  });

  it("falls back to Spanish intro from information", () => {
    expect(resolveAnnouncementBodyText("", UPEN_INFORMATION)).toContain(
      "¡Bienvenidos al UPEN Open 2026",
    );
  });

  it("returns empty string when neither source has text", () => {
    expect(resolveAnnouncementBodyText("  ", null)).toBe("");
  });
});

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

    expect(caption).toContain(
      "Hay desafíos que no se vencen solo con velocidad.",
    );
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

describe("formatPlaceLine", () => {
  it("joins city and state with the default separator", () => {
    expect(formatPlaceLine("Tepic", "Nayarit")).toBe("Tepic · Nayarit");
  });

  it("uses a custom separator for cover titles", () => {
    expect(formatPlaceLine("Tepic", "Nayarit", { separator: ". " })).toBe(
      "Tepic. Nayarit",
    );
  });

  it("does not duplicate state when city already includes it", () => {
    expect(formatPlaceLine("Salamanca, Guanajuato", "Guanajuato")).toBe(
      "Salamanca, Guanajuato",
    );
  });

  it("returns whichever side exists", () => {
    expect(formatPlaceLine("Tepic", null)).toBe("Tepic");
    expect(formatPlaceLine("", "Nayarit")).toBe("Nayarit");
    expect(formatPlaceLine(null, null)).toBe("");
  });
});

describe("formatCoverDateRange", () => {
  it("formats a multi-day range like the Canva cover", () => {
    expect(formatCoverDateRange("2026-05-16", "2026-05-17")).toBe(
      "16 MAY - 17 MAY",
    );
  });

  it("formats a single day", () => {
    expect(formatCoverDateRange("2026-05-16", "2026-05-16")).toBe("16 MAY");
  });
});

describe("formatCoverRegistrationRange", () => {
  it("formats registration datetimes to short date ranges", () => {
    expect(
      formatCoverRegistrationRange(
        "2026-04-02T17:00:00.000Z",
        "2026-05-04T05:59:59.000Z",
      ),
    ).toBe("02 ABR - 04 MAY");
  });

  it("returns null when both sides are missing", () => {
    expect(formatCoverRegistrationRange(null, null)).toBeNull();
  });
});

describe("selectCoverCompetitions", () => {
  it("keeps at most 9 competitions", () => {
    const comps = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    expect(selectCoverCompetitions(comps)).toHaveLength(COVER_MAX_SLOTS);
    expect(selectCoverCompetitions(comps).map((c) => c.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
});

describe("generateCoverPngFromInputs", () => {
  it("generates a PNG buffer for cover slots without logos", async () => {
    const result = await generateCoverPngFromInputs([
      {
        city: "Tepic",
        stateName: "Nayarit",
        startDate: "2026-05-16",
        endDate: "2026-05-17",
        registrationOpen: "2026-04-01T00:00:00.000Z",
        registrationClose: "2026-05-01T00:00:00.000Z",
      },
      {
        city: "Irapuato",
        stateName: "Guanajuato",
        startDate: "2026-05-23",
        endDate: "2026-05-24",
      },
    ]);

    expect(result.slotCount).toBe(2);
    expect(result.hash).toHaveLength(64);
    expect(result.png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }, 20_000);
});

describe("facebookPostUrl", () => {
  it("builds a facebook.com URL from a post id", () => {
    expect(facebookPostUrl("123_456")).toBe("https://www.facebook.com/123_456");
  });
});
