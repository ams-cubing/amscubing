import type { Competition, Region, State } from "@workspace/db/schema";

/** What the public calendar may send to the browser for one competition. */
export type CalendarCompetition = {
  id: number;
  name: string | null;
  startDate: string;
  endDate: string;
  capacity: number;
  statusPublic: Competition["statusPublic"];
  statusInternal: Competition["statusInternal"] | null;
  isChampionship: boolean;
  wcaCompetitionUrl: string | null;
  state: { name: string | null; region: { displayName: string } };
};

/**
 * Non-delegates only learn details of announced competitions. Unannounced
 * championships are left out entirely: their multi-day block would give them away.
 */
export function toCalendarCompetition(
  row: Competition & { state: State & { region: Region } },
  viewerIsDelegate: boolean,
): CalendarCompetition | null {
  const announced = row.statusPublic === "announced";
  if (!viewerIsDelegate && !announced && row.isChampionship) return null;

  const visible = viewerIsDelegate || announced;
  return {
    id: row.id,
    name: visible ? row.name : null,
    startDate: row.startDate,
    endDate: row.endDate,
    capacity: row.capacity,
    statusPublic: row.statusPublic,
    statusInternal: viewerIsDelegate ? row.statusInternal : null,
    isChampionship: visible && row.isChampionship,
    wcaCompetitionUrl: visible ? row.wcaCompetitionUrl : null,
    state: {
      name: visible ? row.state.name : null,
      region: { displayName: row.state.region.displayName },
    },
  };
}
