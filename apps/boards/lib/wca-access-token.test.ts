import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, update, updateSet, updateWhere } = vi.hoisted(() => {
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  return {
    findFirst: vi.fn(),
    update,
    updateSet,
    updateWhere,
  };
});

vi.mock("@workspace/db", () => ({
  db: {
    query: {
      account: { findFirst },
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

describe("getWcaAccessTokenForUser", () => {
  beforeEach(() => {
    findFirst.mockReset();
    update.mockClear();
    updateSet.mockClear();
    updateWhere.mockReset();
    updateWhere.mockResolvedValue(undefined);
    vi.unstubAllGlobals();
    process.env.WCA_CLIENT_ID = "client";
    process.env.WCA_CLIENT_SECRET = "secret";
  });

  it("refreshes to resync scope when manage_competitions is missing from stored scope", async () => {
    findFirst.mockResolvedValue({
      id: "acc_1",
      accessToken: "old-token",
      refreshToken: "refresh-1",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      scope: "public,email",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-token",
        refresh_token: "refresh-2",
        expires_in: 7200,
        scope: "public email manage_competitions",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getWcaAccessTokenForUser("user_1");

    expect(result).toEqual({
      ok: true,
      accessToken: "new-token",
      scope: "public email manage_competitions",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "new-token",
        scope: "public email manage_competitions",
      }),
    );
  });

  it("returns missing_scope when refresh still lacks manage_competitions", async () => {
    findFirst.mockResolvedValue({
      id: "acc_1",
      accessToken: "old-token",
      refreshToken: "refresh-1",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      scope: "public,email",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          expires_in: 7200,
          scope: "public email",
        }),
      }),
    );

    const result = await getWcaAccessTokenForUser("user_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_scope");
      expect(result.message).toContain("manage_competitions");
    }
  });
});
