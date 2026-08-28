import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Auth } from "./auth";
import { createSessionHelpers } from "./session";

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
    user: {
      id: "user-1",
      role,
      wcaId: "2020TEST01",
      name: "Test User",
      email: "test@example.com",
    },
  });
}

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
    await expect(requireSessionOrUnauthorized()).rejects.toThrow("UNAUTHORIZED");
    expect(unauthorized).toHaveBeenCalled();
  });

  it("returns session for authenticated users", async () => {
    sessionFor("user");
    const session = await requireSessionOrUnauthorized();
    expect(session.user.role).toBe("user");
  });
});
