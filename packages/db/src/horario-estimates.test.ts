import { describe, expect, it } from "vitest";

import {
  estimateRoundDurationMinutes,
  getHorarioEventEstimate,
  horarioEstimateCorpusLabel,
} from "./horario-estimates";

describe("horario estimate lookup", () => {
  it("returns national constants for known events", () => {
    const lookup = getHorarioEventEstimate("333");
    expect(lookup?.source).toBe("national");
    expect(lookup?.estimate.sampleSize).toBeGreaterThan(0);
  });

  it("prefers regional cells when sample is large enough", () => {
    const regional = getHorarioEventEstimate("333", { regionId: "occidente" });
    expect(regional?.source).toBe("region");
    expect(regional?.regionLabel).toBe("Occidente");

    const missingRegion = getHorarioEventEstimate("333", {
      regionId: "centro",
    });
    expect(missingRegion?.source).toBe("national");
  });

  it("estimates multi-group rounds from group slots", () => {
    const minutes = estimateRoundDurationMinutes({
      eventId: "333",
      competitors: 78,
      groups: 5,
      regionId: "occidente",
    });
    // 5 × regional medianMinutesPerGroup, rounded up to 5 min
    expect(minutes).toBeGreaterThanOrEqual(90);
    expect(minutes! % 5).toBe(0);
  });

  it("floors single-group finals at 30 minutes", () => {
    const minutes = estimateRoundDurationMinutes({
      eventId: "333",
      competitors: 10,
      groups: 1,
    });
    expect(minutes).toBeGreaterThanOrEqual(30);
  });

  it("labels the corpus for UI copy", () => {
    expect(horarioEstimateCorpusLabel("occidente")).toBe("Occidente");
    expect(horarioEstimateCorpusLabel("centro")).toBe("México");
    expect(horarioEstimateCorpusLabel(null)).toBe("México");
  });
});
