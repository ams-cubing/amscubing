import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireDelegate,
  findFirst,
  transaction,
  getEligibleReassignmentDelegate,
  restoreAvailability,
  holdAvailability,
  insertNotifications,
  sendDateRequestDelegateEmail,
  sendDateRequestDeclinedOrganizerEmail,
  revalidatePath,
  updateTag,
} = vi.hoisted(() => ({
  requireDelegate: vi.fn(),
  findFirst: vi.fn(),
  transaction: vi.fn(),
  getEligibleReassignmentDelegate: vi.fn(),
  restoreAvailability: vi.fn(),
  holdAvailability: vi.fn(),
  insertNotifications: vi.fn(),
  sendDateRequestDelegateEmail: vi.fn(),
  sendDateRequestDeclinedOrganizerEmail: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
  updateTag,
}));

vi.mock("@/lib/session", () => ({
  requireDelegate,
}));

vi.mock("@workspace/db", () => ({
  db: {
    transaction,
    query: {
      dateRequests: {
        findFirst,
      },
    },
  },
}));

vi.mock("@workspace/db/schema", () => ({
  dateRequests: { id: "id" },
}));

vi.mock("@workspace/db/competition-transitions", () => ({
  createCompetitionFromDateRequestAccept: vi.fn(),
}));

vi.mock("@workspace/db/notifications", () => ({
  insertNotifications,
  dateRequestNotificationRow: vi.fn((row) => row),
}));

vi.mock("@/lib/find-eligible-delegate", () => ({
  getEligibleReassignmentDelegate,
}));

vi.mock("@/lib/availability-dates", () => ({
  restoreAvailability,
  holdAvailability,
}));

vi.mock("@/lib/calendar-emails", () => ({
  sendDateRequestAcceptedOrganizerEmail: vi.fn(),
  sendDateRequestDeclinedOrganizerEmail,
  sendDateRequestDelegateEmail,
}));

vi.mock("@/lib/notification-urls", () => ({
  notificationAppUrls: vi.fn(() => ({
    calendarUrl: "http://localhost:3001",
    boardsUrl: "http://localhost:3002",
  })),
}));

vi.mock("@workspace/server/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { declineDateRequest } from "./respond-date-request";

const openRequest = {
  id: 10,
  city: "Puebla",
  stateId: "pue",
  startDate: "2027-02-06",
  endDate: "2027-02-07",
  status: "open" as const,
  proposedDelegateWcaId: "2018PERE05",
  declinedDelegateWcaIds: [] as string[],
  competitionId: null,
  requestedByUserId: "org-1",
  requester: {
    id: "org-1",
    name: "Organizer",
    email: "org@example.com",
    wcaId: "2010ORGA01",
    role: "user" as const,
  },
};

describe("declineDateRequest (solicitud)", () => {
  beforeEach(() => {
    requireDelegate.mockReset();
    findFirst.mockReset();
    transaction.mockReset();
    getEligibleReassignmentDelegate.mockReset();
    restoreAvailability.mockReset();
    holdAvailability.mockReset();
    insertNotifications.mockReset();
    sendDateRequestDelegateEmail.mockReset();
    sendDateRequestDeclinedOrganizerEmail.mockReset();
    revalidatePath.mockReset();

    requireDelegate.mockResolvedValue({
      ok: true,
      session: {
        user: {
          id: "del-1",
          wcaId: "2018PERE05",
          name: "Delegate",
          email: "del@example.com",
          role: "delegate",
        },
      },
    });
    findFirst.mockResolvedValue(openRequest);
  });

  it("rejects when reason is missing", async () => {
    const result = await declineDateRequest(10, { reason: "  " });
    expect(result.success).toBe(false);
    expect(result.message).toContain("motivo");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("exhausts without replacement and emails the organizer with the reason", async () => {
    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const tx = {
      update: vi.fn(() => ({ set: updateSet })),
    };
    transaction.mockImplementation(async (fn: (innerTx: unknown) => unknown) =>
      fn(tx),
    );

    const result = await declineDateRequest(10, {
      reason: "Tengo otro compromiso",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("sin delegado");
    expect(getEligibleReassignmentDelegate).not.toHaveBeenCalled();
    expect(restoreAvailability).toHaveBeenCalled();
    expect(holdAvailability).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        proposedDelegateWcaId: null,
        status: "exhausted",
        lastDeclineReason: "Tengo otro compromiso",
      }),
    );
    expect(sendDateRequestDelegateEmail).not.toHaveBeenCalled();
    expect(sendDateRequestDeclinedOrganizerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "Tengo otro compromiso",
        nextDelegateName: null,
      }),
    );
  });

  it("reassigns to the chosen eligible delegate", async () => {
    const next = {
      id: "del-2",
      wcaId: "2019NEXT01",
      name: "Next Delegate",
      email: "next@example.com",
      role: "delegate" as const,
    };
    getEligibleReassignmentDelegate.mockResolvedValue(next);

    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const tx = {
      update: vi.fn(() => ({ set: updateSet })),
    };
    transaction.mockImplementation(async (fn: (innerTx: unknown) => unknown) =>
      fn(tx),
    );

    const result = await declineDateRequest(10, {
      reason: "Prefiero que lo tome alguien de la región",
      replacementWcaId: "2019NEXT01",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Next Delegate");
    expect(getEligibleReassignmentDelegate).toHaveBeenCalledWith(
      expect.objectContaining({
        replacementWcaId: "2019NEXT01",
        excludeWcaIds: ["2018PERE05"],
      }),
      tx,
    );
    expect(holdAvailability).toHaveBeenCalledWith(
      tx,
      "2019NEXT01",
      "2027-02-06",
      "2027-02-07",
    );
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        proposedDelegateWcaId: "2019NEXT01",
        lastDeclineReason: "Prefiero que lo tome alguien de la región",
      }),
    );
    expect(sendDateRequestDelegateEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "next@example.com" }),
    );
    expect(sendDateRequestDeclinedOrganizerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        nextDelegateName: "Next Delegate",
        reason: "Prefiero que lo tome alguien de la región",
      }),
    );
  });

  it("rejects an ineligible replacement", async () => {
    getEligibleReassignmentDelegate.mockResolvedValue(null);
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({}),
    );

    const result = await declineDateRequest(10, {
      reason: "Motivo válido",
      replacementWcaId: "2019BUSY01",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("no está disponible");
    expect(sendDateRequestDeclinedOrganizerEmail).not.toHaveBeenCalled();
  });
});
