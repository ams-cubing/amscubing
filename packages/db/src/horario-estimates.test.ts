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

  it("estimates duration from groups using the selected corpus", () => {
    const minutes = estimateRoundDurationMinutes({
      eventId: "333",
      competitors: 80,
      groups: 5,
      regionId: "occidente",
    });
    expect(minutes).toBeGreaterThan(0);
    expect(minutes! % 5).toBe(0);
  });

  it("labels the corpus for UI copy", () => {
    expect(horarioEstimateCorpusLabel("occidente")).toBe("Occidente");
    expect(horarioEstimateCorpusLabel("centro")).toBe("México");
    expect(horarioEstimateCorpusLabel(null)).toBe("México");
  });
});
