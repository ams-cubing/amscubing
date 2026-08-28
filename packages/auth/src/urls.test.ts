import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAuthBaseUrl,
  getAuthCookieDomain,
  getBoardsUrl,
  getCalendarUrl,
  getCrossAppSignInUrl,
  getTrustedOrigins,
  isAllowedReturnTo,
  stripTrailingSlash,
} from "./urls";

function resetEnv() {
  vi.unstubAllEnvs();
}

describe("stripTrailingSlash", () => {
  it("removes a trailing slash", () => {
    expect(stripTrailingSlash("https://calendario.amscubing.org/")).toBe(
      "https://calendario.amscubing.org",
    );
  });

  it("keeps URLs without trailing slash", () => {
    expect(stripTrailingSlash("https://tablero.amscubing.org")).toBe(
      "https://tablero.amscubing.org",
    );
  });
});

describe("URL helpers from env", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("getCalendarUrl prefers NEXT_PUBLIC_CALENDAR_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_CALENDAR_URL", "https://cal.example/");
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example");
    expect(getCalendarUrl()).toBe("https://cal.example");
  });

  it("getCalendarUrl falls back to BETTER_AUTH_URL", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example/");
    expect(getCalendarUrl()).toBe("https://auth.example");
  });

  it("getCalendarUrl defaults to localhost:3001", () => {
    expect(getCalendarUrl()).toBe("http://localhost:3001");
  });

  it("getBoardsUrl uses NEXT_PUBLIC_BOARDS_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_BOARDS_URL", "https://boards.example/");
    expect(getBoardsUrl()).toBe("https://boards.example");
  });

  it("getBoardsUrl defaults to localhost:3002", () => {
    expect(getBoardsUrl()).toBe("http://localhost:3002");
  });

  it("getAuthBaseUrl matches calendar URL resolution", () => {
    vi.stubEnv("NEXT_PUBLIC_CALENDAR_URL", "https://cal.example");
    expect(getAuthBaseUrl()).toBe("https://cal.example");
  });
});

describe("getTrustedOrigins", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("deduplicates calendar, boards, and auth origins", () => {
    vi.stubEnv("NEXT_PUBLIC_CALENDAR_URL", "https://cal.example");
    vi.stubEnv("NEXT_PUBLIC_BOARDS_URL", "https://boards.example");
    vi.stubEnv("NODE_ENV", "production");

    const origins = getTrustedOrigins();
    expect(origins).toEqual(
      expect.arrayContaining([
        "https://cal.example",
        "https://boards.example",
      ]),
    );
    expect(origins.length).toBe(2);
  });

  it("includes localhost ports in non-production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const origins = getTrustedOrigins();
    expect(origins).toContain("http://localhost:3001");
    expect(origins).toContain("http://localhost:3002");
  });
});

describe("getAuthCookieDomain", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("returns trimmed AUTH_COOKIE_DOMAIN", () => {
    vi.stubEnv("AUTH_COOKIE_DOMAIN", "  .amscubing.org  ");
    expect(getAuthCookieDomain()).toBe(".amscubing.org");
  });

  it("returns undefined when unset", () => {
    expect(getAuthCookieDomain()).toBeUndefined();
  });
});

describe("isAllowedReturnTo", () => {
  beforeEach(() => {
    resetEnv();
    vi.stubEnv("NEXT_PUBLIC_CALENDAR_URL", "https://cal.example");
    vi.stubEnv("NEXT_PUBLIC_BOARDS_URL", "https://boards.example");
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    resetEnv();
  });

  it("allows same-app paths", () => {
    expect(isAllowedReturnTo("/boards/1")).toBe(true);
    expect(isAllowedReturnTo("/panel")).toBe(true);
  });

  it("rejects protocol-relative paths", () => {
    expect(isAllowedReturnTo("//evil.example")).toBe(false);
  });

  it("allows trusted absolute URLs", () => {
    expect(isAllowedReturnTo("https://boards.example/boards/1")).toBe(true);
  });

  it("rejects untrusted absolute URLs", () => {
    expect(isAllowedReturnTo("https://evil.example/phish")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isAllowedReturnTo("not-a-url")).toBe(false);
  });
});

describe("getCrossAppSignInUrl", () => {
  beforeEach(() => {
    resetEnv();
    vi.stubEnv("NEXT_PUBLIC_CALENDAR_URL", "https://cal.example");
  });

  afterEach(() => {
    resetEnv();
  });

  it("builds calendar login URL with returnTo", () => {
    expect(getCrossAppSignInUrl("https://boards.example/boards/1")).toBe(
      "https://cal.example/iniciar-sesion?returnTo=https%3A%2F%2Fboards.example%2Fboards%2F1",
    );
  });
});
