import { describe, expect, it } from "vitest";

import {
  isLiveExternalSideEffectsEnabled,
  isSimulatedExternalId,
  simulatedExternalId,
} from "./external-side-effects";

describe("isLiveExternalSideEffectsEnabled", () => {
  it("is live only for Vercel production without beta hosts", () => {
    expect(
      isLiveExternalSideEffectsEnabled({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_WEB_URL: "https://amscubing.org",
        NEXT_PUBLIC_CALENDAR_URL: "https://calendario.amscubing.org",
      }),
    ).toBe(true);
  });

  it("simulates on Vercel preview / staging", () => {
    expect(
      isLiveExternalSideEffectsEnabled({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_WEB_URL: "https://beta.amscubing.org",
        NEXT_PUBLIC_CALENDAR_URL: "https://beta.calendario.amscubing.org",
      }),
    ).toBe(false);
  });

  it("simulates when public URLs use beta hosts even if VERCEL_ENV=production", () => {
    expect(
      isLiveExternalSideEffectsEnabled({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_WEB_URL: "https://beta.amscubing.org",
      }),
    ).toBe(false);
  });

  it("respects AMS_EXTERNAL_DRY_RUN and AMS_LIVE_EXTERNAL overrides", () => {
    expect(
      isLiveExternalSideEffectsEnabled({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_WEB_URL: "https://amscubing.org",
        AMS_EXTERNAL_DRY_RUN: "1",
      }),
    ).toBe(false);

    expect(
      isLiveExternalSideEffectsEnabled({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_WEB_URL: "https://beta.amscubing.org",
        AMS_LIVE_EXTERNAL: "true",
      }),
    ).toBe(true);
  });

  it("simulates locally when VERCEL_ENV is unset", () => {
    expect(
      isLiveExternalSideEffectsEnabled({
        NEXT_PUBLIC_WEB_URL: "http://localhost:3000",
      }),
    ).toBe(false);
  });
});

describe("simulated external ids", () => {
  it("marks sim: ids as simulated", () => {
    expect(isSimulatedExternalId("sim:fb:abc")).toBe(true);
    expect(isSimulatedExternalId("123_456")).toBe(false);
    expect(isSimulatedExternalId(null)).toBe(false);
  });

  it("builds ids with the sim: prefix", () => {
    expect(simulatedExternalId("fb").startsWith("sim:fb:")).toBe(true);
  });
});
