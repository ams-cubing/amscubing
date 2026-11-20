import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, update, updateSet, updateWhere } = vi.hoisted(() => {
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  return {
    findMany: vi.fn(),
    update,
    updateSet,
    updateWhere,
  };
});

vi.mock("@workspace/db", () => ({
  db: {
    query: {
      account: { findMany },
    },
    update,
  },
}));

vi.mock("@workspace/db/schema", () => ({
  account: {
    id: "id",
    userId: "userId",
    providerId: "providerId",
  },
}));

vi.mock("@workspace/server/log", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getWcaAccessTokenForUser,
  hasManageCompetitionsScope,
  pickWcaAccountRow,
} from "./wca-access-token";

describe("hasManageCompetitionsScope", () => {
  it("accepts space or comma separated scopes", () => {
    expect(hasManageCompetitionsScope("public email manage_competitions")).toBe(
      true,
    );
    expect(hasManageCompetitionsScope("public,email,manage_competitions")).toBe(
      true,
    );
    expect(hasManageCompetitionsScope("public,email")).toBe(false);
  });
});

describe("pickWcaAccountRow", () => {
  it("prefers numeric WCA account ids over legacy stubs", () => {
    const chosen = pickWcaAccountRow([
      {
        id: "stub",
        accountId: "2016TORO03",
        accessToken: "a",
        refreshToken: "r",
        accessTokenExpiresAt: new Date("2026-01-01"),
        scope: "public email",
        updatedAt: new Date("2026-11-21"),
      },
      {
        id: "real",
        accountId: "22106",
        accessToken: "b",
        refreshToken: "s",
        accessTokenExpiresAt: new Date("2026-01-01"),
        scope: "public,email",
        updatedAt: new Date("2026-11-20"),
      },
    ]);
    expect(chosen?.id).toBe("real");
  });
});

describe("getWcaAccessTokenForUser", () => {
  beforeEach(() => {
    findMany.mockReset();
    update.mockClear();
    updateSet.mockClear();
    updateWhere.mockReset();
    updateWhere.mockResolvedValue(undefined);
    vi.unstubAllGlobals();
    process.env.WCA_CLIENT_ID = "client";
    process.env.WCA_CLIENT_SECRET = "secret";
  });

  it("uses a non-expired token even when stored scope lacks manage_competitions", async () => {
    findMany.mockResolvedValue([
      {
        id: "real",
        accountId: "22106",
        accessToken: "fresh-token",
        refreshToken: "refresh-1",
        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "public,email",
        updatedAt: new Date(),
      },
    ]);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getWcaAccessTokenForUser("user_1");

    expect(result).toEqual({
      ok: true,
      accessToken: "fresh-token",
      scope: "public,email",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes only when the access token is expired", async () => {
    findMany.mockResolvedValue([
      {
        id: "real",
        accountId: "22106",
        accessToken: "old-token",
        refreshToken: "refresh-1",
        accessTokenExpiresAt: new Date(Date.now() - 60_000),
        scope: "public,email",
        updatedAt: new Date(),
      },
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          expires_in: 7200,
          scope: "public email manage_competitions",
        }),
      }),
    );

    const result = await getWcaAccessTokenForUser("user_1");
    expect(result).toEqual({
      ok: true,
      accessToken: "new-token",
      scope: "public email manage_competitions",
    });
  });
});
