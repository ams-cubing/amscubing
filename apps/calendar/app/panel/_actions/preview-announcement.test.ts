import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, findFirst, buildAnnouncementPreview } = vi.hoisted(() => ({
  getSession: vi.fn(),
  findFirst: vi.fn(),
  buildAnnouncementPreview: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@workspace/db", () => ({
  db: { query: { competitions: { findFirst } } },
}));

vi.mock("@workspace/db/schema", () => ({
  competitions: { id: "id" },
}));

vi.mock("@workspace/social", () => ({
  buildAnnouncementPreview,
}));

import { previewAnnouncement } from "@/app/panel/_actions/preview-announcement";

const competition = {
  city: "Chiconcuac",
  name: null,
  startDate: "2026-11-01",
  endDate: "2026-11-01",
  capacity: 60,
  socialCustomText: null,
  socialTags: null,
  socialFlyerUrl: null,
  state: { name: "Estado de México" },
};

describe("previewAnnouncement", () => {
  beforeEach(() => {
    getSession.mockReset();
    findFirst.mockReset();
    buildAnnouncementPreview.mockReset();
  });

  it("rejects non-delegates without building a preview", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", role: "user", wcaId: "2020USER01" },
    });

    const result = await previewAnnouncement(7, "https://wca/x");

    expect(result.success).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
    expect(buildAnnouncementPreview).not.toHaveBeenCalled();
  });

  it("returns the WCA error message", async () => {
    getSession.mockResolvedValue({
      user: { id: "d1", role: "delegate", wcaId: "2010DEL01" },
    });
    findFirst.mockResolvedValue(competition);
    buildAnnouncementPreview.mockResolvedValue({
      ok: false,
      message: "No se pudo obtener la competencia de la WCA (404).",
    });

    const result = await previewAnnouncement(7, "https://wca/x");

    expect(result).toEqual({
      success: false,
      message: "No se pudo obtener la competencia de la WCA (404).",
    });
  });

  it("builds the preview from server-side competition data", async () => {
    getSession.mockResolvedValue({
      user: { id: "d1", role: "delegate", wcaId: "2010DEL01" },
    });
    findFirst.mockResolvedValue(competition);
    buildAnnouncementPreview.mockResolvedValue({
      ok: true,
      displayName: "Chiconcuac Open 2026",
      wcaUrl: "https://www.worldcubeassociation.org/competitions/Chi2026",
      imageUrl: "https://example.com/logo.png",
      logoUrl: "https://example.com/logo.png",
      flyerUrl: null,
      caption: "Caption",
    });

    const result = await previewAnnouncement(7, "https://wca/x");

    expect(buildAnnouncementPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        wcaCompetitionUrl: "https://wca/x",
        city: "Chiconcuac",
        stateName: "Estado de México",
        socialCustomText: "",
      }),
    );
    expect(result).toEqual({
      success: true,
      preview: {
        displayName: "Chiconcuac Open 2026",
        wcaUrl: "https://www.worldcubeassociation.org/competitions/Chi2026",
        imageUrl: "https://example.com/logo.png",
        caption: "Caption",
      },
    });
  });
});
