import { describe, expect, it } from "vitest";

import { CHICONCUAC_2026_TRIMMED } from "./fixtures/chiconcuac2026-trimmed";
import {
  aggregateHorarioEstimates,
  eventsPlanFromWcifMetrics,
  flattenWcifRounds,
  inferStationCount,
} from "./flatten-rounds";

describe("flattenWcifRounds (Chiconcuac trimmed)", () => {
  const rows = flattenWcifRounds(CHICONCUAC_2026_TRIMMED);

  it("extracts competitors, groups, and scheduled minutes", () => {
    const r1 = rows.find((row) => row.roundId === "333-r1");
    expect(r1).toMatchObject({
      competitors: 78,
      groups: 5,
      scheduledMinutes: 90,
      approxStations: 16,
    });
    expect(r1?.minutesPerGroup).toBe(18);

    const two = rows.find((row) => row.roundId === "222-r1");
    expect(two).toMatchObject({
      competitors: 75,
      groups: 5,
      scheduledMinutes: 60,
    });
  });

  it("maps eventsPlan and station inference for board seeding", () => {
    const plan = eventsPlanFromWcifMetrics(rows);
    expect(plan.find((item) => item.eventId === "333")).toMatchObject({
      expectedCompetitors: 78,
      rounds: 3,
      timeLimitCs: 60000,
      cutoffCs: null,
    });
    expect(plan.find((item) => item.eventId === "444")).toMatchObject({
      expectedCompetitors: 65,
      rounds: 1,
      cutoffCs: 6000,
    });
    expect(inferStationCount(rows)).toBe(17); // ceil(75/5)=15, ceil(78/5)=16, ceil(65/4)=17
  });

  it("aggregates national per-event medians", () => {
    const aggregate = aggregateHorarioEstimates(rows);
    const three = aggregate.national.find((item) => item.eventId === "333");
    expect(three?.sampleSize).toBe(3);
    expect(three?.medianMinutesPerGroup).toBeGreaterThan(0);
    expect(aggregate.byRegion).toEqual({});
  });

  it("emits regional cells only when sampleSize >= 5", () => {
    const tagged = flattenWcifRounds(CHICONCUAC_2026_TRIMMED, {
      stateId: "MEX",
      regionId: "centro",
    });
    expect(tagged.every((row) => row.regionId === "centro")).toBe(true);

    const sparse = aggregateHorarioEstimates(tagged);
    expect(sparse.byRegion.centro).toBeUndefined();

    const padded = [
      ...tagged,
      ...tagged.map((row) => ({
        ...row,
        competitionId: `${row.competitionId}-b`,
        roundId: `${row.roundId}-b`,
      })),
    ];
    const rich = aggregateHorarioEstimates(padded);
    const centro333 = rich.byRegion.centro?.find((item) => item.eventId === "333");
    expect(centro333?.sampleSize).toBe(6);
  });
});
