import { describe, expect, it } from "vitest";

import {
  AMS_COMPETITION_TIERS,
  formatCompetitorsBand,
  formatDelegatesLabel,
  formatStationsBand,
  resolveCompetitionScale,
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
    expect(formatCompetitorsBand(AMS_COMPETITION_TIERS[0]!, 0)).toBe("1-80");
    expect(formatCompetitorsBand(AMS_COMPETITION_TIERS[1]!, 1)).toBe("81-120");
    expect(formatCompetitorsBand(AMS_COMPETITION_TIERS[4]!, 4)).toBe("241+");
    expect(formatStationsBand(AMS_COMPETITION_TIERS[0]!)).toBe("8");
    expect(formatStationsBand(AMS_COMPETITION_TIERS[4]!)).toBe("30+");
  });
});
