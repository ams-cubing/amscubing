import { afterEach, describe, expect, it, vi } from "vitest";

import { dateRangeStrings, toDateOnlyString } from "@/lib/availability-dates";

describe("toDateOnlyString", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats local calendar day without UTC shift", () => {
    const localMidnight = new Date(2026, 2, 15, 0, 0, 0, 0);
    expect(toDateOnlyString(localMidnight)).toBe("2026-03-15");

    // East of UTC: local midnight is the previous calendar day in UTC.
    const offsetMinutes = localMidnight.getTimezoneOffset();
    if (offsetMinutes < 0) {
      expect(localMidnight.toISOString().split("T")[0]).toBe("2026-03-14");
    }
  });
});

describe("dateRangeStrings", () => {
  it("expands an inclusive local day range", () => {
    expect(dateRangeStrings("2026-03-15", "2026-03-17")).toEqual([
      "2026-03-15",
      "2026-03-16",
      "2026-03-17",
    ]);
  });

  it("returns a single day when start equals end", () => {
    expect(dateRangeStrings("2026-03-15", "2026-03-15")).toEqual([
      "2026-03-15",
    ]);
  });

  it("returns empty for invalid dates", () => {
    expect(dateRangeStrings("not-a-date", "2026-03-15")).toEqual([]);
  });
});
