import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Auth } from "./auth";
import { createSessionHelpers } from "./session";
import { toSessionUser } from "./types";

const { getSession, unauthorized } = vi.hoisted(() => {
  const unauthorizedFn = vi.fn(() => {
    throw new Error("UNAUTHORIZED");
  });

  return {
    getSession: vi.fn(),
    unauthorized: unauthorizedFn,
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  unauthorized,
}));

const auth = {
  api: {
    getSession,
  },
} as unknown as Auth;

const { requireDelegate, requireSession, requireSessionOrUnauthorized } =
  createSessionHelpers(auth);

function sessionFor(role: "delegate" | "user" | null) {
  if (!role) {
    getSession.mockResolvedValue(null);
    return;
  }
  getSession.mockResolvedValue({
    session: {
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date("2030-01-01"),
      token: "token",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    user: {
      id: "user-1",
      role,
      wcaId: "2020TEST01",
      name: "Test User",
      email: "test@example.com",
      // Intentionally omit nullable fields to exercise toSessionUser defaults.
    },
  });
}

describe("toSessionUser", () => {
  it("normalizes role and null defaults", () => {
    const user = toSessionUser({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      wcaId: "2020TEST01",
      role: "delegate",
    });

    expect(user.role).toBe("delegate");
    expect(user.image).toBeNull();
    expect(user.regionId).toBeNull();
    expect(user.delegateTitle).toBeNull();
    expect(user.delegateLocation).toBeNull();
    expect(user.lastLogin).toBeNull();
    expect(user.emailVerified).toBe(false);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("maps unknown roles to user", () => {
    const user = toSessionUser({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      wcaId: "2020TEST01",
      role: "admin",
    });
    expect(user.role).toBe("user");
  });
});

describe("requireSession", () => {
  beforeEach(() => {
    getSession.mockReset();
    unauthorized.mockClear();
  });

  it("returns error when there is no session", async () => {
    sessionFor(null);
    const result = await requireSession();
    expect(result).toEqual({ ok: false, message: "No autenticado" });
  });

  it("returns session for authenticated users", async () => {
    sessionFor("user");
    const result = await requireSession();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.user.role).toBe("user");
      expect(result.session.user.image).toBeNull();
      expect(result.session.user.wcaId).toBe("2020TEST01");
    }
  });
});

describe("requireDelegate", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("rejects unauthenticated callers", async () => {
    sessionFor(null);
    const result = await requireDelegate();
    expect(result).toEqual({ ok: false, message: "No autenticado" });
  });

  it("rejects non-delegate users", async () => {
    sessionFor("user");
    const result = await requireDelegate();
    expect(result).toEqual({
      ok: false,
      message: "Solo delegados pueden realizar esta acción",
    });
  });

  it("allows delegates", async () => {
    sessionFor("delegate");
    const result = await requireDelegate();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.user.role).toBe("delegate");
    }
  });
});

describe("requireSessionOrUnauthorized", () => {
  beforeEach(() => {
    getSession.mockReset();
    unauthorized.mockClear();
  });

  it("calls unauthorized when there is no session", async () => {
    sessionFor(null);
    await expect(requireSessionOrUnauthorized()).rejects.toThrow(
      "UNAUTHORIZED",
    );
    expect(unauthorized).toHaveBeenCalled();
  });

  it("returns session for authenticated users", async () => {
    sessionFor("user");
    const session = await requireSessionOrUnauthorized();
    expect(session.user.role).toBe("user");
  });
});
