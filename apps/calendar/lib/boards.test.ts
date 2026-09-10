import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canSeeBoardsNav } from "./boards";

function resetEnv() {
  vi.unstubAllEnvs();
}

describe("canSeeBoardsNav", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("is false for anonymous users", () => {
    expect(canSeeBoardsNav(null)).toBe(false);
    expect(canSeeBoardsNav(undefined)).toBe(false);
  });

  it("is true for delegates when the allowlist is empty", () => {
    expect(
      canSeeBoardsNav({ role: "delegate", wcaId: "2010DEL01" }),
    ).toBe(true);
  });

  it("is true for delegates when not on a non-empty allowlist", () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    expect(
      canSeeBoardsNav({ role: "delegate", wcaId: "2010DEL01" }),
    ).toBe(true);
  });

  it("is true for allowlisted organizers", () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016toro03,2017ABCD01");
    expect(
      canSeeBoardsNav({ role: "user", wcaId: "2016TORO03" }),
    ).toBe(true);
  });

  it("is false for organizers not on the allowlist", () => {
    vi.stubEnv("BOARDS_ORGANIZER_ALLOWLIST", "2016TORO03");
    expect(
      canSeeBoardsNav({ role: "user", wcaId: "2018OUT01" }),
    ).toBe(false);
  });

  it("is false for organizers when the allowlist is empty", () => {
    expect(
      canSeeBoardsNav({ role: "user", wcaId: "2018ANY01" }),
    ).toBe(false);
  });
});
