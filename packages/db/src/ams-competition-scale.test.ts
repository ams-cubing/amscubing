import { describe, expect, it } from "vitest";

import {
  DEFAULT_AMS_COMPETITION_TIERS,
  formatCompetitorsBand,
  formatDelegatesLabel,
  formatStationsBand,
  normalizeScaleTiers,
  resolveCompetitionScale,
  resolveOrganizerExperienceLevel,
  serializeScaleTiers,
} from "./ams-competition-scale";

describe("resolveCompetitionScale", () => {
  it("maps competitor band edges", () => {
    expect(resolveCompetitionScale({ capacity: 80, stationCount: null }).level)
      .toBe("debutante");
    expect(resolveCompetitionScale({ capacity: 81, stationCount: null }).level)
      .toBe("super");
    expect(
      resolveCompetitionScale({ capacity: 120, stationCount: null }).level,
    ).toBe("super");
    expect(
      resolveCompetitionScale({ capacity: 121, stationCount: null }).level,
    ).toBe("experto");
    expect(
      resolveCompetitionScale({ capacity: 241, stationCount: null }).level,
    ).toBe("leyenda");
  });

  it("raises tier when stations are stricter than cupo", () => {
    const scale = resolveCompetitionScale({
      capacity: 50,
      stationCount: 16,
    });
    expect(scale.level).toBe("experto");
    expect(scale.minDelegates).toBe(2);
    expect(scale.maxEvents).toBe(12);
  });

  it("uses capacity alone when stations are unset", () => {
    const scale = resolveCompetitionScale({
      capacity: 100,
      stationCount: null,
    });
    expect(scale.level).toBe("super");
    expect(scale.maxStations).toBe(10);
  });

  it("maps station band edges with low cupo", () => {
    expect(
      resolveCompetitionScale({ capacity: 40, stationCount: 8 }).level,
    ).toBe("debutante");
    expect(
      resolveCompetitionScale({ capacity: 40, stationCount: 10 }).level,
    ).toBe("super");
    expect(
      resolveCompetitionScale({ capacity: 40, stationCount: 11 }).level,
    ).toBe("experto");
    expect(
      resolveCompetitionScale({ capacity: 40, stationCount: 30 }).level,
    ).toBe("leyenda");
  });

  it("formats open-ended leyenda delegates", () => {
    const scale = resolveCompetitionScale({
      capacity: 300,
      stationCount: 32,
    });
    expect(formatDelegatesLabel(scale)).toBe("4+");
  });

  it("formats table band labels", () => {
    const tiers = DEFAULT_AMS_COMPETITION_TIERS;
    expect(formatCompetitorsBand(tiers[0]!, 0, tiers)).toBe("1-80");
    expect(formatCompetitorsBand(tiers[1]!, 1, tiers)).toBe("81-120");
    expect(formatCompetitorsBand(tiers[4]!, 4, tiers)).toBe("241+");
    expect(formatStationsBand(tiers[0]!)).toBe("8");
    expect(formatStationsBand(tiers[4]!, tiers[3]!.maxStations)).toBe("21+");
  });

  it("round-trips serialize/normalize defaults", () => {
    const stored = serializeScaleTiers(DEFAULT_AMS_COMPETITION_TIERS);
    expect(stored[4]!.maxCompetitors).toBeNull();
    const tiers = normalizeScaleTiers(stored);
    expect(tiers).toHaveLength(5);
    expect(tiers[4]!.maxCompetitors).toBe(Number.POSITIVE_INFINITY);
    expect(tiers[0]!.level).toBe("debutante");
  });

  it("maps organizer experience from competition count", () => {
    expect(
      resolveOrganizerExperienceLevel({ organizedCount: 1 }).tier.level,
    ).toBe("debutante");
    expect(
      resolveOrganizerExperienceLevel({ organizedCount: 2 }).tier.level,
    ).toBe("super");
    expect(
      resolveOrganizerExperienceLevel({ organizedCount: 4 }).tier.level,
    ).toBe("experto");
    expect(
      resolveOrganizerExperienceLevel({ organizedCount: 5 }).tier.level,
    ).toBe("maestro");
    expect(
      resolveOrganizerExperienceLevel({ organizedCount: 9 }).tier.level,
    ).toBe("leyenda");
  });
});
