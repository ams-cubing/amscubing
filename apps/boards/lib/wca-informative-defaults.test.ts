import { describe, expect, it } from "vitest";

import {
  checkInAndTutorialFromWcif,
  formatActivityLabel,
  formatVenueAddress,
  scheduleOverviewFromWcif,
  type PublicWcifSchedule,
} from "./wca-informative-defaults";

describe("formatVenueAddress", () => {
  it("joins name and address when distinct", () => {
    expect(
      formatVenueAddress({
        venueName: "Auditorio UPEN",
        venueAddress: "Av. Ejemplo 1, Pachuca",
      }),
    ).toBe("Auditorio UPEN — Av. Ejemplo 1, Pachuca");
  });

  it("avoids duplicating name when already in address", () => {
    expect(
      formatVenueAddress({
        venueName: "Auditorio UPEN",
        venueAddress: "Auditorio UPEN, Av. Ejemplo 1",
      }),
    ).toBe("Auditorio UPEN, Av. Ejemplo 1");
  });
});

describe("WCIF schedule helpers", () => {
  const wcif: PublicWcifSchedule = {
    schedule: {
      venues: [
        {
          rooms: [
            {
              name: "Main",
              activities: [
                {
                  name: "Tutorial",
                  activityCode: "other-tutorial",
                  startTime: "2026-05-16T14:30:00.000Z",
                  endTime: "2026-05-16T15:00:00.000Z",
                },
                {
                  name: "Check-in",
                  activityCode: "other-checkin",
                  startTime: "2026-05-16T14:00:00.000Z",
                  endTime: "2026-05-16T14:30:00.000Z",
                },
                {
                  name: "3x3 Final",
                  activityCode: "333-r3",
                  startTime: "2026-05-16T20:00:00.000Z",
                  endTime: "2026-05-16T21:00:00.000Z",
                },
              ],
            },
          ],
        },
      ],
    },
  };

  it("formats activity labels in Mexico City time", () => {
    const label = formatActivityLabel({
      startTime: "2026-05-16T14:00:00.000Z",
      endTime: "2026-05-16T14:30:00.000Z",
    });
    expect(label).toMatch(/sábado/i);
    expect(label).toContain("16 de mayo");
    expect(label).toMatch(/8:00/);
  });

  it("pulls check-in and tutorial by activity code", () => {
    const { checkIn, tutorialTime } = checkInAndTutorialFromWcif(wcif);
    expect(checkIn).toMatch(/sábado/i);
    expect(checkIn).toContain("8:00");
    expect(tutorialTime).toMatch(/sábado/i);
    expect(tutorialTime).toContain("8:30");
  });

  it("builds a chronological schedule overview", () => {
    const overview = scheduleOverviewFromWcif(wcif);
    expect(overview).toContain("Check-in");
    expect(overview).toContain("Tutorial");
    expect(overview).toContain("3x3 Final");
    expect(overview.indexOf("Check-in")).toBeLessThan(
      overview.indexOf("Tutorial"),
    );
  });
});
