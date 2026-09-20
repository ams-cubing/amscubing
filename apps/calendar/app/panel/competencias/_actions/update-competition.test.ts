import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  transaction,
  findFirst,
  findManyDelegates,
  findManyOrganizers,
  insertValues,
  deleteWhere,
  updateWhere,
  holdAvailability,
  restoreAvailability,
  revalidatePath,
  revalidateTag,
  publishCompetitionSocialAnnouncement,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  transaction: vi.fn(),
  findFirst: vi.fn(),
  findManyDelegates: vi.fn(),
  findManyOrganizers: vi.fn(),
  insertValues: vi.fn(),
  deleteWhere: vi.fn(),
  updateWhere: vi.fn(),
  holdAvailability: vi.fn(),
  restoreAvailability: vi.fn(),
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
      competitions: { findFirst },
      competitionDelegates: { findMany: findManyDelegates },
      competitionOrganizers: { findMany: findManyOrganizers },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
}));

vi.mock("@workspace/db/schema", () => ({
  competitions: {
    id: "id",
    statusPublic: {
      enumValues: [
        "open",
        "reserved",
        "confirmed",
        "announced",
        "suspended",
        "unavailable",
      ],
    },
    statusInternal: {
      enumValues: [
        "asked_for_help",
        "looking_for_venue",
        "venue_found",
        "wca_approved",
        "registration_open",
        "celebrated",
        "cancelled",
      ],
    },
  },
  competitionDelegates: { competitionId: "competition_id" },
  competitionOrganizers: { competitionId: "competition_id" },
  boards: { competitionId: "competition_id" },
  logs: {},
}));

vi.mock("@workspace/db/notifications", () => ({
  insertNotifications: vi.fn().mockResolvedValue(undefined),
  competitionNotificationRow: vi.fn(() => ({})),
  formatInternalStatusLabel: vi.fn((s: string) => s),
  formatPublicStatusLabel: vi.fn((s: string) => s),
  userIdsByWcaIds: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/calendar-emails", () => ({
  sendCompetitionStatusChangedEmail: vi.fn(),
  sendDelegateAssignedEmail: vi.fn(),
  sendDelegateRemovedEmail: vi.fn(),
  sendOrganizerAssignedEmail: vi.fn(),
  sendOrganizerRemovedEmail: vi.fn(),
}));

vi.mock("@/lib/notification-urls", () => ({
  notificationAppUrls: vi.fn(() => ({
    calendarUrl: "http://localhost:3001",
    boardsUrl: "http://localhost:3002",
  })),
}));

vi.mock("@workspace/social", () => ({
  publishCompetitionSocialAnnouncement,
  refreshTorneoDeRubikCoverBestEffort: vi.fn(),
}));

vi.mock("@/lib/availability-dates", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/availability-dates")
  >("@/lib/availability-dates");
  return {
    ...actual,
    holdAvailability,
    restoreAvailability,
  };
});

import { updateCompetition } from "@/app/panel/competencias/_actions/update-competition";

describe("updateCompetition pending preservation", () => {
  beforeEach(() => {
    getSession.mockReset();
    transaction.mockReset();
    findFirst.mockReset();
    findManyDelegates.mockReset();
    findManyOrganizers.mockReset();
    insertValues.mockReset();
    deleteWhere.mockReset();
    updateWhere.mockReset();
    holdAvailability.mockReset();
    restoreAvailability.mockReset();
    revalidatePath.mockReset();
    revalidateTag.mockReset();
    publishCompetitionSocialAnnouncement.mockReset();

    getSession.mockResolvedValue({
      user: { id: "delegate-1", role: "delegate", wcaId: "2010DEL01" },
    });

    findFirst.mockResolvedValue({
      trelloUrl: null,
      trelloAssignedAt: null,
      statusPublic: "reserved",
      statusInternal: "looking_for_venue",
      city: "Guadalajara",
      capacity: 50,
      announcedPostedAt: null,
      facebookPostId: null,
      instagramMediaId: null,
      socialCustomText: null,
      socialTags: null,
      socialFlyerUrl: null,
      state: { name: "Jalisco" },
    });

    findManyOrganizers.mockResolvedValue([{ organizerWcaId: "2016ORG01" }]);
  });

  it("keeps pending status for unchanged delegates and restores removed", async () => {
    findManyDelegates.mockResolvedValue([
      {
        delegateWcaId: "2010DEL01",
        status: "pending",
        isPrimary: true,
      },
      {
        delegateWcaId: "2011DEL02",
        status: "accepted",
        isPrimary: false,
      },
    ]);

    let capturedDelegates: unknown[] | undefined;

    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: updateWhere.mockResolvedValue(undefined),
            })),
          })),
          delete: vi.fn(() => ({
            where: deleteWhere.mockResolvedValue(undefined),
          })),
          insert: vi.fn((table: { id?: string } | Record<string, unknown>) => ({
            values: (vals: unknown) => {
              // competitionDelegates insert is an array of assignments
              if (Array.isArray(vals) && vals[0]?.delegateWcaId) {
                capturedDelegates = vals as unknown[];
              }
              insertValues(vals);
              return Promise.resolve();
            },
          })),
        };
        await fn(tx);
      },
    );

    const result = await updateCompetition(42, {
      name: "",
      city: "Guadalajara",
      stateId: "JAL",
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 2),
      trelloUrl: "",
      wcaCompetitionUrl: "",
      capacity: 50,
      statusPublic: "reserved",
      statusInternal: "looking_for_venue",
      notes: "",
      delegateWcaIds: ["2010DEL01"],
      primaryDelegateWcaId: "2010DEL01",
      organizerWcaIds: ["2016ORG01"],
      primaryOrganizerWcaId: "2016ORG01",
    });

    expect(result.success).toBe(true);
    expect(capturedDelegates).toEqual([
      expect.objectContaining({
        delegateWcaId: "2010DEL01",
        status: "pending",
        isPrimary: true,
      }),
    ]);
    expect(restoreAvailability).toHaveBeenCalledWith(
      expect.anything(),
      "2011DEL02",
      "2026-06-01",
      "2026-06-02",
    );
    expect(holdAvailability).not.toHaveBeenCalled();
  });

  it("marks newly added delegates as accepted and holds availability", async () => {
    findManyDelegates.mockResolvedValue([
      {
        delegateWcaId: "2010DEL01",
        status: "pending",
        isPrimary: true,
      },
    ]);

    let capturedDelegates: unknown[] | undefined;

    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: updateWhere.mockResolvedValue(undefined),
            })),
          })),
          delete: vi.fn(() => ({
            where: deleteWhere.mockResolvedValue(undefined),
          })),
          insert: vi.fn(() => ({
            values: (vals: unknown) => {
              if (Array.isArray(vals) && vals[0]?.delegateWcaId) {
                capturedDelegates = vals as unknown[];
              }
              insertValues(vals);
              return Promise.resolve();
            },
          })),
        };
        await fn(tx);
      },
    );

    const result = await updateCompetition(42, {
      name: "",
      city: "Guadalajara",
      stateId: "JAL",
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 2),
      trelloUrl: "",
      wcaCompetitionUrl: "",
      capacity: 50,
      statusPublic: "reserved",
      statusInternal: "looking_for_venue",
      notes: "",
      delegateWcaIds: ["2010DEL01", "2012DEL03"],
      primaryDelegateWcaId: "2010DEL01",
      organizerWcaIds: ["2016ORG01"],
      primaryOrganizerWcaId: "2016ORG01",
    });

    expect(result.success).toBe(true);
    expect(capturedDelegates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          delegateWcaId: "2010DEL01",
          status: "pending",
        }),
        expect.objectContaining({
          delegateWcaId: "2012DEL03",
          status: "accepted",
        }),
      ]),
    );
    expect(holdAvailability).toHaveBeenCalledWith(
      expect.anything(),
      "2012DEL03",
      "2026-06-01",
      "2026-06-02",
    );
  });
});
