import { afterEach, describe, expect, it, vi } from "vitest";

import { assertEnv, checkEnv, coreEnv, mergeEnvSpecs, metaEnv } from "./env";

afterEach(() => {
  vi.restoreAllMocks();
});

const prodEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://ams:ams@localhost:5432/amscubing",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "https://amscubing.org",
  NEXT_PUBLIC_WEB_URL: "https://amscubing.org",
  NEXT_PUBLIC_CALENDAR_URL: "https://calendario.amscubing.org",
  NEXT_PUBLIC_BOARDS_URL: "https://tablero.amscubing.org",
};

describe("checkEnv", () => {
  it("only requires production keys when NODE_ENV=production", () => {
    const dev = checkEnv(coreEnv, { DATABASE_URL: "postgres://x" });
    expect(dev.missing).toEqual([]);

    const prod = checkEnv(coreEnv, {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://x",
    });
    expect(prod.missing).toContain("BETTER_AUTH_SECRET");
    expect(prod.missing).toContain("BETTER_AUTH_URL");
  });

  it("treats blank values as missing", () => {
    expect(checkEnv(coreEnv, { DATABASE_URL: "  " }).missing).toEqual([
      "DATABASE_URL",
    ]);
  });

  it("validates secret length and URL formats", () => {
    const report = checkEnv(coreEnv, {
      ...prodEnv,
      BETTER_AUTH_SECRET: "short",
      NEXT_PUBLIC_WEB_URL: "not a url",
    });
    expect(report.invalid.map((i) => i.key).sort()).toEqual([
      "BETTER_AUTH_SECRET",
      "NEXT_PUBLIC_WEB_URL",
    ]);
  });

  it("reports missing optional keys separately", () => {
    const report = checkEnv(mergeEnvSpecs(coreEnv, metaEnv), prodEnv);
    expect(report.missing).toEqual([]);
    expect(report.missingOptional).toEqual([
      "META_PAGE_ID",
      "META_PAGE_ACCESS_TOKEN",
      "META_IG_USER_ID",
    ]);
  });
});

describe("assertEnv", () => {
  it("throws listing every problem", () => {
    expect(() =>
      assertEnv("web", coreEnv, { NODE_ENV: "production" }),
    ).toThrowError(/DATABASE_URL: falta[\s\S]*BETTER_AUTH_SECRET: falta/);
  });

  it("warns but does not throw for missing optional keys", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      assertEnv("calendar", mergeEnvSpecs(coreEnv, metaEnv), prodEnv),
    ).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});
