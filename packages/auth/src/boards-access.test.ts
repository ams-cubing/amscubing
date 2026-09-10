import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canAccessBoardsApp,
  getBoardsOrganizerAllowlist,
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

describe("canAccessBoardsApp", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("is false for anonymous users", () => {
    expect(canAccessBoardsApp(null)).toBe(false);
    expect(canAccessBoardsApp(undefined)).toBe(false);
  });

  it("is true for delegates even when the allowlist is empty", () => {
    expect(
      canAccessBoardsApp({ role: "delegate", wcaId: "2010DEL01" }),
    ).toBe(true);
  });

  it("is true for delegates even when not on a non-empty allowlist", () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    expect(
      canAccessBoardsApp({ role: "delegate", wcaId: "2010DEL01" }),
    ).toBe(true);
  });

  it("is false for organizers when the allowlist is empty", () => {
    expect(
      canAccessBoardsApp({ role: "user", wcaId: "2018ANY01" }),
    ).toBe(false);
  });

  it("is true for allowlisted organizers", () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016toro03,2017ABCD01");
    expect(
      canAccessBoardsApp({ role: "user", wcaId: "2016TORO03" }),
    ).toBe(true);
  });

  it("is false for organizers not on the allowlist", () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    expect(
      canAccessBoardsApp({ role: "user", wcaId: "2018OUT01" }),
    ).toBe(false);
  });
});
