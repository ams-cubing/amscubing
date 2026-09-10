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

import { canSeeBoardsNav } from "./boards";

function resetEnv() {
  vi.unstubAllEnvs();
}

describe("canSeeBoardsNav", () => {
  beforeEach(() => {
    resetEnv();
    findFirst.mockReset();
    findFirst.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetEnv();
  });

  it("is false for anonymous users", async () => {
    await expect(canSeeBoardsNav(null)).resolves.toBe(false);
    await expect(canSeeBoardsNav(undefined)).resolves.toBe(false);
  });

  it("is true for delegates when the allowlist is empty", async () => {
    await expect(
      canSeeBoardsNav({ role: "delegate", wcaId: "2010DEL01" }),
    ).resolves.toBe(true);
  });

  it("is true for delegates when not on a non-empty allowlist", async () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    await expect(
      canSeeBoardsNav({ role: "delegate", wcaId: "2010DEL01" }),
    ).resolves.toBe(true);
  });

  it("is true for allowlisted organizers", async () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016toro03,2017ABCD01");
    await expect(
      canSeeBoardsNav({ role: "user", wcaId: "2016TORO03" }),
    ).resolves.toBe(true);
  });

  it("is false for organizers not on the allowlist", async () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    await expect(
      canSeeBoardsNav({ role: "user", wcaId: "2018OUT01" }),
    ).resolves.toBe(false);
  });

  it("is false for organizers when the allowlist is empty", async () => {
    await expect(
      canSeeBoardsNav({ role: "user", wcaId: "2018ANY01" }),
    ).resolves.toBe(false);
  });
});
