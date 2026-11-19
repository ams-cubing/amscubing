import { describe, expect, it } from "vitest";

import {
  CompetitionFormatError,
  estimateRoundPlan,
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
  it("estimates groups and flags 9m breaches on later rounds", () => {
    const plan = estimateRoundPlan({
      expectedCompetitors: 100,
      rounds: 4,
      stationCount: 10,
      eventId: "333",
      estimateDurationMinutes: () => 45,
    });
    expect(plan).toHaveLength(4);
    expect(plan[0]).toMatchObject({
      roundNumber: 1,
      competitors: 100,
      groups: 10,
      exceedsSubsequentLimit: false,
      estimatedMinutes: 45,
    });
    expect(plan[1]?.competitors).toBe(75);
    expect(plan[1]?.groups).toBe(8);
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
});
