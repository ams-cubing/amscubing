import { describe, expect, it } from "vitest";

import {
  CompetitionFormatError,
  normalizeFormatInput,
  recommendedScramblers,
  recommendedStaffMinimum,
} from "./competition-format-rules";

describe("recommendedStaffMinimum", () => {
  it("is stations + 4 for one zone", () => {
    expect(
      recommendedStaffMinimum({ stationCount: 10, zoneCount: 1 }),
    ).toBe(14);
  });

  it("adds 4 per extra zone", () => {
    expect(
      recommendedStaffMinimum({ stationCount: 10, zoneCount: 3 }),
    ).toBe(22);
  });
});

describe("recommendedScramblers", () => {
  it("recommends 2 below 80 competitors", () => {
    expect(
      recommendedScramblers({ capacity: 50, eventIds: ["333", "555"] }),
    ).toEqual({ count: 2, demoEventIds: ["555"] });
  });

  it("recommends 4 at 80+", () => {
    expect(
      recommendedScramblers({
        capacity: 80,
        eventIds: ["333", "clock", "skewb"],
      }),
    ).toEqual({ count: 4, demoEventIds: ["clock", "skewb"] });
  });
});

describe("normalizeFormatInput", () => {
  it("accepts a valid plan", () => {
    expect(
      normalizeFormatInput({
        stationCount: 8,
        zoneCount: 1,
        eventsPlan: [
          {
            eventId: "333",
            expectedCompetitors: 50,
            rounds: 2,
            cutoffCs: null,
            timeLimitCs: 60000,
          },
        ],
      }),
    ).toEqual({
      stationCount: 8,
      zoneCount: 1,
      eventsPlan: [
        {
          eventId: "333",
          expectedCompetitors: 50,
          rounds: 2,
          cutoffCs: null,
          timeLimitCs: 60000,
        },
      ],
    });
  });

  it("allows clearing stations", () => {
    expect(
      normalizeFormatInput({
        stationCount: null,
        zoneCount: 2,
        eventsPlan: [],
      }).stationCount,
    ).toBeNull();
  });

  it("rejects unknown events", () => {
    expect(() =>
      normalizeFormatInput({
        stationCount: 4,
        zoneCount: 1,
        eventsPlan: [
          {
            eventId: "fto",
            expectedCompetitors: 10,
            rounds: 1,
            cutoffCs: null,
            timeLimitCs: null,
          },
        ],
      }),
    ).toThrow(CompetitionFormatError);
  });

  it("rejects duplicate events", () => {
    expect(() =>
      normalizeFormatInput({
        stationCount: 4,
        zoneCount: 1,
        eventsPlan: [
          {
            eventId: "333",
            expectedCompetitors: 10,
            rounds: 1,
            cutoffCs: null,
            timeLimitCs: null,
          },
          {
            eventId: "333",
            expectedCompetitors: 12,
            rounds: 1,
            cutoffCs: null,
            timeLimitCs: null,
          },
        ],
      }),
    ).toThrow(/duplicada/);
  });
});
