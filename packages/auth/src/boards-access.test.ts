import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    query: {
      boardsOrganizerAllowlist: {
        findFirst,
      },
    },
  },
}));

vi.mock("@workspace/db/schema", () => ({
  boardsOrganizerAllowlist: {
    wcaId: "wca_id",
  },
}));

import {
  canAccessBoardsApp,
  getBoardsOrganizerAllowlist,
  isWcaIdOnBoardsAllowlist,
} from "./boards-access";

function resetEnv() {
  vi.unstubAllEnvs();
}

describe("getBoardsOrganizerAllowlist", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("returns an empty set when unset or blank", () => {
    expect(getBoardsOrganizerAllowlist().size).toBe(0);

    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "  ");
    expect(getBoardsOrganizerAllowlist().size).toBe(0);
  });

  it("parses comma-separated WCA IDs case-insensitively", () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016toro03, 2017ABCD01 ,");
    expect([...getBoardsOrganizerAllowlist()].sort()).toEqual([
      "2016TORO03",
      "2017ABCD01",
    ]);
  });
});

describe("isWcaIdOnBoardsAllowlist", () => {
  beforeEach(() => {
    resetEnv();
    findFirst.mockReset();
    findFirst.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetEnv();
  });

  it("is true when the WCA ID is in the env override", async () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016toro03");
    await expect(isWcaIdOnBoardsAllowlist("2016TORO03")).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("is true when the WCA ID is in the DB table", async () => {
    findFirst.mockResolvedValue({ wcaId: "2016TORO03" });
    await expect(isWcaIdOnBoardsAllowlist("2016toro03")).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalled();
  });

  it("is false when neither env nor DB lists the WCA ID", async () => {
    await expect(isWcaIdOnBoardsAllowlist("2018OUT01")).resolves.toBe(false);
  });
});

describe("canAccessBoardsApp", () => {
  beforeEach(() => {
    resetEnv();
    findFirst.mockReset();
    findFirst.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetEnv();
  });

  it("is false for anonymous users", async () => {
    await expect(canAccessBoardsApp(null)).resolves.toBe(false);
    await expect(canAccessBoardsApp(undefined)).resolves.toBe(false);
  });

  it("is true for delegates even when the allowlist is empty", async () => {
    await expect(
      canAccessBoardsApp({ role: "delegate", wcaId: "2010DEL01" }),
    ).resolves.toBe(true);
  });

  it("is true for delegates even when not on a non-empty allowlist", async () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    await expect(
      canAccessBoardsApp({ role: "delegate", wcaId: "2010DEL01" }),
    ).resolves.toBe(true);
  });

  it("is false for organizers when the allowlist is empty", async () => {
    await expect(
      canAccessBoardsApp({ role: "user", wcaId: "2018ANY01" }),
    ).resolves.toBe(false);
  });

  it("is true for env-allowlisted organizers", async () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016toro03,2017ABCD01");
    await expect(
      canAccessBoardsApp({ role: "user", wcaId: "2016TORO03" }),
    ).resolves.toBe(true);
  });

  it("is true for DB-allowlisted organizers", async () => {
    findFirst.mockResolvedValue({ wcaId: "2016TORO03" });
    await expect(
      canAccessBoardsApp({ role: "user", wcaId: "2016TORO03" }),
    ).resolves.toBe(true);
  });

  it("is false for organizers not on the allowlist", async () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    await expect(
      canAccessBoardsApp({ role: "user", wcaId: "2018OUT01" }),
    ).resolves.toBe(false);
  });
});
