/**
 * Trimmed Chiconcuac 2026 WCIF: activity tree + result counts only (no persons).
 * Used for unit tests; keep in sync with public WCIF structure.
 */
import type { Wcif } from "../types";

function results(n: number): unknown[] {
  return Array.from({ length: n }, (_, index) => ({ ranking: index + 1 }));
}

export const CHICONCUAC_2026_TRIMMED: Wcif = {
  id: "Chiconcuac2026",
  name: "Chiconcuac 2026",
  events: [
    {
      id: "333",
      rounds: [
        {
          id: "333-r1",
          format: "a",
          timeLimit: { centiseconds: 60000, cumulativeRoundIds: [] },
          results: results(78),
        },
        {
          id: "333-r2",
          format: "a",
          timeLimit: { centiseconds: 60000, cumulativeRoundIds: [] },
          results: results(34),
        },
        {
          id: "333-r3",
          format: "a",
          timeLimit: { centiseconds: 60000, cumulativeRoundIds: [] },
          results: results(10),
        },
      ],
    },
    {
      id: "222",
      rounds: [
        {
          id: "222-r1",
          format: "a",
          timeLimit: { centiseconds: 60000, cumulativeRoundIds: [] },
          results: results(75),
        },
        {
          id: "222-r2",
          format: "a",
          timeLimit: { centiseconds: 60000, cumulativeRoundIds: [] },
          results: results(10),
        },
      ],
    },
    {
      id: "444",
      rounds: [
        {
          id: "444-r1",
          format: "a",
          cutoff: { numberOfAttempts: 2, attemptResult: 6000 },
          timeLimit: { centiseconds: 60000, cumulativeRoundIds: [] },
          results: results(65),
        },
      ],
    },
  ],
  schedule: {
    venues: [
      {
        rooms: [
          {
            name: "Auditorio Principal",
            activities: [
              {
                activityCode: "222-r1",
                startTime: "2026-11-14T15:00:00Z",
                endTime: "2026-11-14T16:00:00Z",
                childActivities: [
                  {
                    activityCode: "222-r1-g1",
                    startTime: "2026-11-14T15:00:00Z",
                    endTime: "2026-11-14T15:12:00Z",
                  },
                  {
                    activityCode: "222-r1-g2",
                    startTime: "2026-11-14T15:12:00Z",
                    endTime: "2026-11-14T15:24:00Z",
                  },
                  {
                    activityCode: "222-r1-g3",
                    startTime: "2026-11-14T15:24:00Z",
                    endTime: "2026-11-14T15:36:00Z",
                  },
                  {
                    activityCode: "222-r1-g4",
                    startTime: "2026-11-14T15:36:00Z",
                    endTime: "2026-11-14T15:48:00Z",
                  },
                  {
                    activityCode: "222-r1-g5",
                    startTime: "2026-11-14T15:48:00Z",
                    endTime: "2026-11-14T16:00:00Z",
                  },
                ],
              },
              {
                activityCode: "444-r1",
                startTime: "2026-11-14T17:30:00Z",
                endTime: "2026-11-14T19:00:00Z",
                childActivities: [
                  {
                    activityCode: "444-r1-g1",
                    startTime: "2026-11-14T17:30:00Z",
                    endTime: "2026-11-14T17:52:30Z",
                  },
                  {
                    activityCode: "444-r1-g2",
                    startTime: "2026-11-14T17:52:30Z",
                    endTime: "2026-11-14T18:15:00Z",
                  },
                  {
                    activityCode: "444-r1-g3",
                    startTime: "2026-11-14T18:15:00Z",
                    endTime: "2026-11-14T18:37:30Z",
                  },
                  {
                    activityCode: "444-r1-g4",
                    startTime: "2026-11-14T18:37:30Z",
                    endTime: "2026-11-14T19:00:00Z",
                  },
                ],
              },
              {
                activityCode: "333-r1",
                startTime: "2026-11-14T21:30:00Z",
                endTime: "2026-11-14T23:00:00Z",
                childActivities: [
                  {
                    activityCode: "333-r1-g1",
                    startTime: "2026-11-14T21:30:00Z",
                    endTime: "2026-11-14T21:48:00Z",
                  },
                  {
                    activityCode: "333-r1-g2",
                    startTime: "2026-11-14T21:48:00Z",
                    endTime: "2026-11-14T22:06:00Z",
                  },
                  {
                    activityCode: "333-r1-g3",
                    startTime: "2026-11-14T22:06:00Z",
                    endTime: "2026-11-14T22:24:00Z",
                  },
                  {
                    activityCode: "333-r1-g4",
                    startTime: "2026-11-14T22:24:00Z",
                    endTime: "2026-11-14T22:42:00Z",
                  },
                  {
                    activityCode: "333-r1-g5",
                    startTime: "2026-11-14T22:42:00Z",
                    endTime: "2026-11-14T23:00:00Z",
                  },
                ],
              },
              {
                activityCode: "333-r2",
                startTime: "2026-11-15T15:00:00Z",
                endTime: "2026-11-15T16:00:00Z",
                childActivities: [
                  {
                    activityCode: "333-r2-g1",
                    startTime: "2026-11-15T15:00:00Z",
                    endTime: "2026-11-15T15:30:00Z",
                  },
                  {
                    activityCode: "333-r2-g2",
                    startTime: "2026-11-15T15:30:00Z",
                    endTime: "2026-11-15T16:00:00Z",
                  },
                ],
              },
              {
                activityCode: "333-r3",
                startTime: "2026-11-15T22:00:00Z",
                endTime: "2026-11-15T22:30:00Z",
                childActivities: [
                  {
                    activityCode: "333-r3-g1",
                    startTime: "2026-11-15T22:00:00Z",
                    endTime: "2026-11-15T22:30:00Z",
                  },
                ],
              },
              {
                activityCode: "222-r2",
                startTime: "2026-11-15T21:30:00Z",
                endTime: "2026-11-15T22:00:00Z",
                childActivities: [
                  {
                    activityCode: "222-r2-g1",
                    startTime: "2026-11-15T21:30:00Z",
                    endTime: "2026-11-15T22:00:00Z",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
