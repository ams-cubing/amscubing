import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireDelegate,
  findFirst,
  findMany,
  transaction,
  selectLimit,
  getEligibleReassignmentDelegate,
  declinePendingDelegateAssignment,
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
  findMany: vi.fn(),
  transaction: vi.fn(),
  selectLimit: vi.fn(),
  getEligibleReassignmentDelegate: vi.fn(),
  declinePendingDelegateAssignment: vi.fn(),
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
      competitions: { findFirst },
      competitionDelegates: { findMany },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: selectLimit,
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@workspace/db/schema", () => ({
  competitions: { id: "id" },
  competitionDelegates: {},
  competitionOrganizers: {
    competitionId: "competition_id",
    organizerUserId: "organizer_user_id",
    isPrimary: "is_primary",
  },
  user: { id: "id" },
}));

vi.mock("@workspace/db/competition-transitions", () => ({
  acceptPendingDelegateAssignment: vi.fn(),
  declinePendingDelegateAssignment,
}));

vi.mock("@workspace/db/notifications", () => ({
  insertNotifications,
  competitionNotificationRow: vi.fn((row) => row),
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

describe("declineDateRequest (competencia)", () => {
  beforeEach(() => {
    requireDelegate.mockReset();
    findFirst.mockReset();
    findMany.mockReset();
    transaction.mockReset();
    selectLimit.mockReset();
    getEligibleReassignmentDelegate.mockReset();
    declinePendingDelegateAssignment.mockReset();
    restoreAvailability.mockReset();
    holdAvailability.mockReset();
    insertNotifications.mockReset();
    sendDateRequestDelegateEmail.mockReset();
    sendDateRequestDeclinedOrganizerEmail.mockReset();

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
    findFirst.mockResolvedValue({
      id: 42,
      city: "Puebla",
      stateId: "pue",
      startDate: "2027-02-06",
      endDate: "2027-02-07",
    });
    findMany.mockResolvedValue([]);
    selectLimit.mockResolvedValue([
      {
        id: "org-1",
        name: "Organizer",
        email: "org@example.com",
        wcaId: "2010ORGA01",
        role: "user",
      },
    ]);
  });

  it("requires a reason", async () => {
    const result = await declineDateRequest(42, { reason: "" });
    expect(result.success).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("declines without replacement and stores the reason", async () => {
    transaction.mockImplementation(async (fn: (tx: object) => unknown) =>
      fn({}),
    );

    const result = await declineDateRequest(42, {
      reason: "Conflicto de agenda",
    });

    expect(result.success).toBe(true);
    expect(declinePendingDelegateAssignment).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        competitionId: 42,
        delegateWcaId: "2018PERE05",
        declineReason: "Conflicto de agenda",
        nextDelegate: null,
      }),
    );
    expect(sendDateRequestDeclinedOrganizerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "Conflicto de agenda",
        nextDelegateName: null,
      }),
    );
  });

  it("reassigns to a chosen delegate", async () => {
    const next = {
      id: "del-2",
      wcaId: "2019NEXT01",
      name: "Next Delegate",
      email: "next@example.com",
      role: "delegate" as const,
    };
    getEligibleReassignmentDelegate.mockResolvedValue(next);
    transaction.mockImplementation(async (fn: (tx: object) => unknown) =>
      fn({}),
    );

    const result = await declineDateRequest(42, {
      reason: "Mejor lo toma Next",
      replacementWcaId: "2019NEXT01",
    });

    expect(result.success).toBe(true);
    expect(declinePendingDelegateAssignment).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        declineReason: "Mejor lo toma Next",
        nextDelegate: { wcaId: "2019NEXT01" },
      }),
    );
    expect(holdAvailability).toHaveBeenCalled();
    expect(sendDateRequestDelegateEmail).toHaveBeenCalled();
    expect(sendDateRequestDeclinedOrganizerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        nextDelegateName: "Next Delegate",
        reason: "Mejor lo toma Next",
      }),
    );
  });
});
