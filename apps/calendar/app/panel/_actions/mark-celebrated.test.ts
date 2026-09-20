import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  transaction,
  revalidatePath,
  revalidateTag,
  applyStatusTransition,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  applyStatusTransition: vi.fn(),
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
  },
}));

vi.mock("@workspace/db/competition-transitions", () => ({
  applyStatusTransition,
}));

vi.mock("@workspace/db/notifications", () => ({
  competitionOrganizersOnly: vi.fn().mockResolvedValue([]),
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

import { markAsCelebrated } from "@/app/panel/_actions/mark-celebrated";

describe("markAsCelebrated", () => {
  beforeEach(() => {
    getSession.mockReset();
    transaction.mockReset();
    revalidatePath.mockReset();
    revalidateTag.mockReset();
    applyStatusTransition.mockReset();
    applyStatusTransition.mockResolvedValue({
      city: "CDMX",
      from: {
        statusPublic: "announced",
        statusInternal: "wca_approved",
      },
      to: {
        statusPublic: "announced",
        statusInternal: "celebrated",
      },
      statusLabel: "Celebrado",
      effects: {
        requiresSocialPublish: false,
        archiveBoard: false,
        notify: true,
      },
    });
    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
    );
  });

  it("rejects non-delegates without touching the database", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", role: "user", wcaId: "2020USER01" },
    });

    const result = await markAsCelebrated(42);

    expect(result).toEqual({
      success: false,
      message: "Solo delegados pueden realizar esta acción",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    getSession.mockResolvedValue(null);

    const result = await markAsCelebrated(42);

    expect(result).toEqual({
      success: false,
      message: "No autenticado",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("updates the competition for delegates", async () => {
    getSession.mockResolvedValue({
      user: { id: "delegate-1", role: "delegate", wcaId: "2010DEL01" },
    });

    const result = await markAsCelebrated(7);

    expect(result).toEqual({
      success: true,
      message: "Competencia marcada como celebrada",
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(applyStatusTransition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        competitionId: 7,
        transitionId: "celebrate",
      }),
    );
  });
});
