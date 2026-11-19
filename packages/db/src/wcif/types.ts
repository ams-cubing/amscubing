/** Minimal WCIF shapes used for horario analysis (public endpoint). */

export type WcifActivity = {
  id?: number;
  name?: string;
  activityCode: string;
  startTime: string;
  endTime: string;
  childActivities?: WcifActivity[];
};

export type WcifRoom = {
  name?: string;
  activities?: WcifActivity[];
};

export type WcifVenue = {
  rooms?: WcifRoom[];
};

export type WcifCutoff = {
  numberOfAttempts?: number;
  attemptResult?: number;
} | null;

export type WcifTimeLimit = {
  centiseconds?: number;
  cumulativeRoundIds?: string[];
} | null;

export type WcifRound = {
  id: string;
  format?: string;
  cutoff?: WcifCutoff;
  timeLimit?: WcifTimeLimit;
  results?: unknown[];
};

export type WcifEvent = {
  id: string;
  rounds?: WcifRound[];
};

export type Wcif = {
  id: string;
  name?: string;
  events?: WcifEvent[];
  schedule?: {
    venues?: WcifVenue[];
  };
};

export type FlatRoundMetric = {
  competitionId: string;
  eventId: string;
  roundNumber: number;
  roundId: string;
  format: string | null;
  competitors: number;
  groups: number;
  scheduledMinutes: number;
  cutoffCs: number | null;
  timeLimitCs: number | null;
  minutesPerGroup: number;
  competitorsPerGroup: number;
  minutesPerCompetitor: number;
  approxStations: number;
};
