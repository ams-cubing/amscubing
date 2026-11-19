import { describe, expect, it } from "vitest";

import {
  CompetitionFormatError,
  DEFAULT_TIME_LIMIT_CS,
  HOUR_TIME_LIMIT_CS,
  defaultTimeLimitCs,
  estimateRoundPlan,
  isTimeLimitEditable,
  maxAdvancingCompetitors,
  maxRoundsAllowed,
  maxSubsequentRounds,
  normalizeFormatInput,
  recommendedScramblers,
  recommendedStaffMinimum,
} from "./competition-format-rules";

describe("maxRoundsAllowed (9m)", () => {
  it("caps by competitor thresholds", () => {
    expect(maxRoundsAllowed(7)).toBe(1);
    expect(maxRoundsAllowed(8)).toBe(2);
    expect(maxRoundsAllowed(15)).toBe(2);
    expect(maxRoundsAllowed(16)).toBe(3);
    expect(maxRoundsAllowed(99)).toBe(3);
    expect(maxRoundsAllowed(100)).toBe(4);
  });

  it("exposes subsequent and advance ceilings", () => {
    expect(maxSubsequentRounds(12)).toBe(1);
    expect(maxAdvancingCompetitors(100)).toBe(75);
  });
});

describe("estimateRoundPlan", () => {
  it("packs groups denser than 1:1 stations and sizes finals to stations", () => {
    const plan = estimateRoundPlan({
      expectedCompetitors: 78,
      rounds: 3,
      stationCount: 10,
      eventId: "333",
      estimateDurationMinutes: () => 45,
    });
    expect(plan).toHaveLength(3);
    // 78 / (10 × 1.6) → 5 groups (Chiconcuac 2026 actual)
    expect(plan[0]).toMatchObject({
      roundNumber: 1,
      competitors: 78,
      groups: 5,
      exceedsSubsequentLimit: false,
      estimatedMinutes: 45,
    });
    expect(plan[1]?.competitors).toBe(58); // 9p ceiling from R1
    expect(plan[2]).toMatchObject({
      roundNumber: 3,
      competitors: 10, // final ≈ stations
      groups: 1,
    });
  });

  it("leaves groups null without stations", () => {
    expect(
      estimateRoundPlan({
        expectedCompetitors: 20,
        rounds: 2,
        stationCount: null,
      })[0]?.groups,
    ).toBeNull();
  });
});

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
            eventId: "teamblind",
            expectedCompetitors: 10,
            rounds: 1,
            cutoffCs: null,
            timeLimitCs: null,
          },
        ],
      }),
    ).toThrow(CompetitionFormatError);
  });

  it("accepts FTO", () => {
    expect(
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
      }).eventsPlan[0]?.eventId,
    ).toBe("fto");
  });

  it("rejects expected competitors above capacity", () => {
    expect(() =>
      normalizeFormatInput({
        stationCount: 4,
        zoneCount: 1,
        maxExpectedCompetitors: 50,
        eventsPlan: [
          {
            eventId: "333",
            expectedCompetitors: 51,
            rounds: 1,
            cutoffCs: null,
            timeLimitCs: null,
          },
        ],
      }),
    ).toThrow(/cupo/);
  });

  it("rejects rounds above 9m for expected competitors", () => {
    expect(() =>
      normalizeFormatInput({
        stationCount: 4,
        zoneCount: 1,
        eventsPlan: [
          {
            eventId: "333",
            expectedCompetitors: 12,
            rounds: 3,
            cutoffCs: null,
            timeLimitCs: null,
          },
        ],
      }),
    ).toThrow(/9m permite máximo 2/);
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

  it("forces a 1-hour limit for FMC and Multi-Blind", () => {
    const plan = normalizeFormatInput({
      stationCount: 4,
      zoneCount: 1,
      eventsPlan: [
        {
          eventId: "333fm",
          expectedCompetitors: 10,
          rounds: 1,
          cutoffCs: null,
          timeLimitCs: 60_000,
        },
        {
          eventId: "333mbf",
          expectedCompetitors: 5,
          rounds: 1,
          cutoffCs: null,
          timeLimitCs: null,
        },
      ],
    }).eventsPlan;

    expect(plan[0]?.timeLimitCs).toBe(HOUR_TIME_LIMIT_CS);
    expect(plan[1]?.timeLimitCs).toBe(HOUR_TIME_LIMIT_CS);
  });

  it("keeps custom limits for 4BLD and 5BLD", () => {
    const plan = normalizeFormatInput({
      stationCount: 4,
      zoneCount: 1,
      eventsPlan: [
        {
          eventId: "444bf",
          expectedCompetitors: 8,
          rounds: 1,
          cutoffCs: null,
          timeLimitCs: 240_000,
        },
        {
          eventId: "555bf",
          expectedCompetitors: 6,
          rounds: 1,
          cutoffCs: null,
          timeLimitCs: 300_000,
        },
      ],
    }).eventsPlan;

    expect(plan[0]?.timeLimitCs).toBe(240_000);
    expect(plan[1]?.timeLimitCs).toBe(300_000);
  });
});

describe("defaultTimeLimitCs", () => {
  it("uses 1 hour for FMC, big BLD, and Multi-Blind", () => {
    expect(defaultTimeLimitCs("333fm")).toBe(HOUR_TIME_LIMIT_CS);
    expect(defaultTimeLimitCs("444bf")).toBe(HOUR_TIME_LIMIT_CS);
    expect(defaultTimeLimitCs("555bf")).toBe(HOUR_TIME_LIMIT_CS);
    expect(defaultTimeLimitCs("333mbf")).toBe(HOUR_TIME_LIMIT_CS);
    expect(defaultTimeLimitCs("333")).toBe(DEFAULT_TIME_LIMIT_CS);
  });

  it("locks FMC and Multi-Blind limits", () => {
    expect(isTimeLimitEditable("333fm")).toBe(false);
    expect(isTimeLimitEditable("333mbf")).toBe(false);
    expect(isTimeLimitEditable("444bf")).toBe(true);
    expect(isTimeLimitEditable("555bf")).toBe(true);
  });
});
