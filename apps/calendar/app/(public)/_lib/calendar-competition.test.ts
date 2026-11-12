import { describe, expect, it } from "vitest";

import { toCalendarCompetition } from "./calendar-competition";

type Row = Parameters<typeof toCalendarCompetition>[0];

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 1,
    name: "Campeonato Mexicano 2027",
    city: "Puebla",
    stateId: "PUE",
    requestedByUserId: null,
    trelloUrl: null,
    wcaCompetitionUrl: "https://www.worldcubeassociation.org/competitions/X",
    startDate: "2027-11-25",
    endDate: "2027-11-28",
    capacity: 400,
    isChampionship: true,
    statusPublic: "confirmed",
    statusInternal: "venue_found",
    notes: "interno",
    trelloAssignedAt: null,
    ultimatumSetTo: null,
    announcedPostedAt: null,
    facebookPostId: null,
    instagramMediaId: null,
    socialPublishedManually: false,
    socialPublishClaimedAt: null,
    socialCustomText: null,
    socialTags: null,
    socialFlyerUrl: null,
    boardId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    state: {
      id: "PUE",
      name: "Puebla",
      regionId: "centro",
      region: { id: "centro", displayName: "Centro" },
    },
    ...overrides,
  } as Row;
}

describe("toCalendarCompetition", () => {
  it("hides unannounced championships from non-delegates", () => {
    expect(toCalendarCompetition(row(), false)).toBeNull();
    expect(
      toCalendarCompetition(row({ statusPublic: "reserved" }), false),
    ).toBeNull();
  });

  it("shows unannounced championships to delegates", () => {
    const result = toCalendarCompetition(row(), true);
    expect(result?.isChampionship).toBe(true);
    expect(result?.name).toBe("Campeonato Mexicano 2027");
    expect(result?.statusInternal).toBe("venue_found");
  });

  it("shows announced championships to everyone", () => {
    const result = toCalendarCompetition(
      row({ statusPublic: "announced" }),
      false,
    );
    expect(result?.isChampionship).toBe(true);
    expect(result?.name).toBe("Campeonato Mexicano 2027");
    expect(result?.statusInternal).toBeNull();
  });

  it("strips details of unannounced competitions for non-delegates", () => {
    const result = toCalendarCompetition(row({ isChampionship: false }), false);
    expect(result).toEqual({
      id: 1,
      name: null,
      startDate: "2027-11-25",
      endDate: "2027-11-28",
      capacity: 400,
      statusPublic: "confirmed",
      statusInternal: null,
      isChampionship: false,
      wcaCompetitionUrl: null,
      state: { name: null, region: { displayName: "Centro" } },
    });
    expect(result).not.toHaveProperty("notes");
  });
});
