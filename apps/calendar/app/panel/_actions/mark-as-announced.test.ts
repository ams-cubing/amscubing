import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  transaction,
  findFirst,
  updateWhere,
  insertValues,
  revalidatePath,
  revalidateTag,
  publishCompetitionSocialAnnouncement,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  transaction: vi.fn(),
  findFirst: vi.fn(),
  updateWhere: vi.fn(),
  insertValues: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  publishCompetitionSocialAnnouncement: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
  revalidateTag,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));

vi.mock("@workspace/db", () => ({
  db: {
    transaction,
    query: {
      competitions: {
        findFirst,
      },
    },
  },
}));

vi.mock("@workspace/db/schema", () => ({
  competitions: { id: "id" },
  logs: {},
}));

vi.mock("@workspace/db/notifications", () => ({
  competitionTeamUsers: vi.fn().mockResolvedValue([]),
  competitionOrganizersOnly: vi.fn().mockResolvedValue([]),
  insertNotifications: vi.fn().mockResolvedValue(undefined),
  formatPublicStatusLabel: vi.fn((status: string) => status),
  competitionNotificationRow: vi.fn(() => ({})),
}));

vi.mock("@/lib/calendar-emails", () => ({
  sendCompetitionStatusChangedEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notification-urls", () => ({
  notificationAppUrls: vi.fn(() => ({
    calendarUrl: "http://localhost:3001",
    boardsUrl: "http://localhost:3002",
  })),
}));

vi.mock("@workspace/social", () => ({
  publishCompetitionSocialAnnouncement,
}));

import { markAsAnnounced } from "@/app/panel/_actions/mark-as-announced";

const confirmedCompetition = {
  city: "CDMX",
  name: "Test Open 2026",
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  statusPublic: "confirmed",
  statusInternal: "wca_approved",
  wcaCompetitionUrl:
    "https://www.worldcubeassociation.org/competitions/TestOpen2026",
  announcedPostedAt: null,
};

describe("markAsAnnounced", () => {
  beforeEach(() => {
    getSession.mockReset();
    transaction.mockReset();
    findFirst.mockReset();
    updateWhere.mockReset();
    insertValues.mockReset();
    revalidatePath.mockReset();
    revalidateTag.mockReset();
    publishCompetitionSocialAnnouncement.mockReset();
  });

  it("rejects non-delegates without touching the database", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", role: "user", wcaId: "2020USER01" },
    });

    const result = await markAsAnnounced(42);

    expect(result).toEqual({
      success: false,
      message: "Solo delegados pueden realizar esta acción",
    });
    expect(findFirst).not.toHaveBeenCalled();
    expect(publishCompetitionSocialAnnouncement).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    getSession.mockResolvedValue(null);

    const result = await markAsAnnounced(42);

    expect(result).toEqual({
      success: false,
      message: "No autenticado",
    });
    expect(findFirst).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects when WCA URL is missing", async () => {
    getSession.mockResolvedValue({
      user: { id: "delegate-1", role: "delegate", wcaId: "2010DEL01" },
    });
    findFirst.mockResolvedValue({
      ...confirmedCompetition,
      wcaCompetitionUrl: null,
    });
    publishCompetitionSocialAnnouncement.mockResolvedValue({
      ok: false,
      message:
        "Debes agregar la URL de la competencia en la WCA antes de anunciar.",
    });

    const result = await markAsAnnounced(7);

    expect(result.success).toBe(false);
    expect(result.message).toContain("URL");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects when custom social text is missing", async () => {
    getSession.mockResolvedValue({
      user: { id: "delegate-1", role: "delegate", wcaId: "2010DEL01" },
    });
    findFirst.mockResolvedValue(confirmedCompetition);
    publishCompetitionSocialAnnouncement.mockResolvedValue({
      ok: false,
      message:
        "Falta el texto personalizado del post. Complétalo en la tarjeta «Publicación redes Torneo de Rubik» del tablero.",
    });

    const result = await markAsAnnounced(7);

    expect(result.success).toBe(false);
    expect(result.message).toContain("texto personalizado");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects when the WCA URL is not a real competition", async () => {
    getSession.mockResolvedValue({
      user: { id: "delegate-1", role: "delegate", wcaId: "2010DEL01" },
    });
    findFirst.mockResolvedValue(confirmedCompetition);
    publishCompetitionSocialAnnouncement.mockResolvedValue({
      ok: false,
      message:
        "No se pudo obtener la competencia de la WCA (404). Verifica la URL.",
    });

    const result = await markAsAnnounced(7);

    expect(result.success).toBe(false);
    expect(result.message).toContain("WCA");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("announces successfully even when there is no competition logo", async () => {
    getSession.mockResolvedValue({
      user: { id: "delegate-1", role: "delegate", wcaId: "2010DEL01" },
    });
    findFirst.mockResolvedValue(confirmedCompetition);
    publishCompetitionSocialAnnouncement.mockResolvedValue({
      ok: true,
      wcaCompetitionUrl: confirmedCompetition.wcaCompetitionUrl,
      facebookPostId: "fb_no_logo",
      instagramMediaId: null,
      displayName: "Test Open 2026",
    });
    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        await fn({
          update: () => ({
            set: () => ({
              where: updateWhere,
            }),
          }),
          insert: () => ({ values: insertValues }),
        });
      },
    );

    const result = await markAsAnnounced(7);

    expect(result.success).toBe(true);
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("rejects when Meta publish fails and does not announce", async () => {
    getSession.mockResolvedValue({
      user: { id: "delegate-1", role: "delegate", wcaId: "2010DEL01" },
    });
    findFirst.mockResolvedValue(confirmedCompetition);
    publishCompetitionSocialAnnouncement.mockResolvedValue({
      ok: false,
      message: "Facebook: (#200) Permissions error",
    });

    const result = await markAsAnnounced(7);

    expect(result).toEqual({
      success: false,
      message: "Facebook: (#200) Permissions error",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("updates the competition after successful social publish", async () => {
    getSession.mockResolvedValue({
      user: { id: "delegate-1", role: "delegate", wcaId: "2010DEL01" },
    });
    findFirst.mockResolvedValue(confirmedCompetition);
    publishCompetitionSocialAnnouncement.mockResolvedValue({
      ok: true,
      wcaCompetitionUrl: confirmedCompetition.wcaCompetitionUrl,
      facebookPostId: "fb_123",
      instagramMediaId: "ig_456",
      displayName: "Test Open 2026",
    });
    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        await fn({
          update: () => ({
            set: () => ({
              where: updateWhere,
            }),
          }),
          insert: () => ({ values: insertValues }),
        });
      },
    );

    const result = await markAsAnnounced(7, {
      wcaCompetitionUrl: confirmedCompetition.wcaCompetitionUrl,
    });

    expect(result).toEqual({
      success: true,
      message: "Competencia anunciada y publicada en Facebook e Instagram",
    });
    expect(publishCompetitionSocialAnnouncement).toHaveBeenCalledOnce();
    expect(transaction).toHaveBeenCalledOnce();
    expect(updateWhere).toHaveBeenCalledOnce();
  });
});
