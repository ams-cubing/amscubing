import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  transaction,
  findMany,
  findEligibleDelegate,
  holdAvailability,
  insertNotifications,
  sendDateRequestDelegateEmail,
  sendDateRequestOrganizerEmail,
  consumeRateLimit,
  requestHeaders,
} = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  requestHeaders: { current: new Headers() },
  getSession: vi.fn(),
  transaction: vi.fn(),
  findMany: vi.fn(),
  findEligibleDelegate: vi.fn(),
  holdAvailability: vi.fn(),
  insertNotifications: vi.fn(),
  sendDateRequestDelegateEmail: vi.fn(),
  sendDateRequestOrganizerEmail: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => requestHeaders.current),
}));

vi.mock("@workspace/db/rate-limit", () => ({
  consumeRateLimit,
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
      dateRequests: {
        findMany,
      },
    },
  },
}));

vi.mock("@workspace/db/schema", () => ({
  dateRequests: {
    requestedByUserId: "requested_by_user_id",
    createdAt: "created_at",
  },
}));

vi.mock("@workspace/db/notifications", () => ({
  insertNotifications,
  dateRequestNotificationRow: vi.fn((row) => row),
}));

vi.mock("@/lib/find-eligible-delegate", () => ({
  findEligibleDelegate,
}));

vi.mock("@/lib/availability-dates", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/availability-dates")
  >("@/lib/availability-dates");
  return {
    ...actual,
    holdAvailability,
  };
});

vi.mock("@/lib/calendar-emails", () => ({
  sendDateRequestDelegateEmail,
  sendDateRequestOrganizerEmail,
}));

vi.mock("@/lib/notification-urls", () => ({
  notificationAppUrls: vi.fn(() => ({
    calendarUrl: "http://localhost:3001",
    boardsUrl: "http://localhost:3002",
  })),
}));

import { submitDateRequest } from "@/app/(public)/solicitar-fecha/_actions/submit-date-request";

describe("submitDateRequest", () => {
  beforeEach(() => {
    getSession.mockReset();
    transaction.mockReset();
    findMany.mockReset();
    findEligibleDelegate.mockReset();
    holdAvailability.mockReset();
    insertNotifications.mockReset();
    sendDateRequestDelegateEmail.mockReset();
    sendDateRequestOrganizerEmail.mockReset();
    findMany.mockResolvedValue([]);
    consumeRateLimit.mockReset();
    consumeRateLimit.mockResolvedValue({ allowed: true, count: 1 });
    requestHeaders.current = new Headers();
  });

  it("rejects bursts before touching the database", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", wcaId: null, email: "org@example.com", name: "Org" },
    });
    requestHeaders.current = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    });
    consumeRateLimit.mockImplementation(async ({ key }: { key: string }) => ({
      allowed: !key.includes(":ip:"),
      count: 11,
    }));

    const result = await submitDateRequest({
      city: "Guadalajara",
      stateId: "JAL",
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 2),
    });

    expect(result).toEqual({
      success: false,
      message: "Demasiadas solicitudes. Intenta de nuevo en unos minutos.",
    });
    expect(consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "calendar:date-request:user:u1" }),
    );
    expect(consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "calendar:date-request:ip:203.0.113.7" }),
    );
    expect(findMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("only applies the per-user limit when no client IP is known", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", wcaId: null, email: "org@example.com", name: "Org" },
    });
    consumeRateLimit.mockResolvedValue({ allowed: false, count: 4 });

    const result = await submitDateRequest({
      city: "Guadalajara",
      stateId: "JAL",
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 2),
    });

    expect(result.success).toBe(false);
    expect(consumeRateLimit).toHaveBeenCalledTimes(1);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects when unauthenticated", async () => {
    getSession.mockResolvedValue(null);

    const result = await submitDateRequest({
      city: "Guadalajara",
      stateId: "JAL",
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 2),
    });

    expect(result.success).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("rejects when weekly rate limit is exceeded", async () => {
    getSession.mockResolvedValue({
      user: {
        id: "u1",
        wcaId: "2016ORG01",
        email: "org@example.com",
        name: "Org",
      },
    });
    findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

    const result = await submitDateRequest({
      city: "Guadalajara",
      stateId: "JAL",
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 2),
    });

    expect(result).toEqual({
      success: false,
      message:
        "Has alcanzado el límite de 3 solicitudes por semana. Intenta de nuevo más tarde.",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects without inserting when no eligible delegate", async () => {
    getSession.mockResolvedValue({
      user: {
        id: "u1",
        wcaId: "2016ORG01",
        email: "org@example.com",
        name: "Org",
      },
    });
    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        findEligibleDelegate.mockResolvedValue(null);
        return fn({
          insert: vi.fn(),
          delete: vi.fn(),
          query: {},
        });
      },
    );

    const result = await submitDateRequest({
      city: "Guadalajara",
      stateId: "JAL",
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 2),
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/No hay un delegado disponible/);
    expect(holdAvailability).not.toHaveBeenCalled();
  });

  it("holds availability when a delegate is proposed, even without a requester WCA ID", async () => {
    getSession.mockResolvedValue({
      user: {
        id: "u1",
        wcaId: null,
        email: "org@example.com",
        name: "Org",
      },
    });

    const returning = vi.fn().mockResolvedValue([
      {
        id: 99,
        city: "Guadalajara",
      },
    ]);
    const values = vi.fn(() => ({ returning }));
    const insert = vi.fn(() => ({ values }));

    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        findEligibleDelegate.mockResolvedValue({
          id: "d1",
          wcaId: "2010DEL01",
          name: "Delegate",
          email: "del@example.com",
          role: "delegate",
        });
        return fn({
          insert,
          delete: vi.fn(),
          query: {},
        });
      },
    );

    const result = await submitDateRequest({
      city: "Guadalajara",
      stateId: "JAL",
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 5, 2),
    });

    expect(result.success).toBe(true);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ requestedByUserId: "u1" }),
    );
    expect(holdAvailability).toHaveBeenCalledWith(
      expect.anything(),
      "2010DEL01",
      "2026-06-01",
      "2026-06-02",
    );
    expect(insertNotifications).toHaveBeenCalled();
  });
});
