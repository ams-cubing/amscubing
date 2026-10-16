export type ReassignmentOption = {
  wcaId: string;
  name: string;
  regionDisplayName: string | null;
  availableDays: number;
  requiredDays: number;
  eligible: boolean;
  inRegion: boolean;
};
