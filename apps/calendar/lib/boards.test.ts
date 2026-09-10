import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canSeeBoardsNav, getBoardsOrganizerAllowlist, isBoardsEnabled } from "./boards";

function resetEnv() {
  vi.unstubAllEnvs();
}

describe("isBoardsEnabled", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("is false when the flag is unset", () => {
    expect(isBoardsEnabled()).toBe(false);
  });

  it("is true only when the flag is the string true", () => {
    vi.stubEnv("NEXT_PUBLIC_BOARDS_ENABLED", "true");
    expect(isBoardsEnabled()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_BOARDS_ENABLED", "1");
    expect(isBoardsEnabled()).toBe(false);
  });
});

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

describe("canSeeBoardsNav", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("is false when boards are disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_BOARDS_ENABLED", "false");
    expect(
      canSeeBoardsNav({ role: "delegate", wcaId: "2010DEL01" }),
    ).toBe(false);
  });

  it("is false for anonymous users even when boards are enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_BOARDS_ENABLED", "true");
    expect(canSeeBoardsNav(null)).toBe(false);
    expect(canSeeBoardsNav(undefined)).toBe(false);
  });

  it("is true for delegates when boards are enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_BOARDS_ENABLED", "true");
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    expect(
      canSeeBoardsNav({ role: "delegate", wcaId: "2010DEL01" }),
    ).toBe(true);
  });

  it("is true for allowlisted organizers", () => {
    vi.stubEnv("NEXT_PUBLIC_BOARDS_ENABLED", "true");
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016toro03,2017ABCD01");
    expect(
      canSeeBoardsNav({ role: "user", wcaId: "2016TORO03" }),
    ).toBe(true);
  });

  it("is false for organizers not on the allowlist", () => {
    vi.stubEnv("NEXT_PUBLIC_BOARDS_ENABLED", "true");
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    expect(
      canSeeBoardsNav({ role: "user", wcaId: "2018OUT01" }),
    ).toBe(false);
  });

  it("treats an empty allowlist as general availability for signed-in users", () => {
    vi.stubEnv("NEXT_PUBLIC_BOARDS_ENABLED", "true");
    expect(
      canSeeBoardsNav({ role: "user", wcaId: "2018ANY01" }),
    ).toBe(true);
  });
});
