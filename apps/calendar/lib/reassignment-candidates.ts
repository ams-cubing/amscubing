import "server-only";

import { listDelegatesForReassignment } from "@/lib/find-eligible-delegate";
import type { ReassignmentOption } from "@/lib/reassignment-option";

export async function getReassignmentOptions(input: {
  stateId: string;
  startDate: string;
  endDate: string;
  excludeWcaIds?: string[];
}): Promise<ReassignmentOption[]> {
  const candidates = await listDelegatesForReassignment(input);
  return candidates.map((candidate) => ({
    wcaId: candidate.wcaId,
    name: candidate.name,
    regionDisplayName: candidate.regionDisplayName,
    availableDays: candidate.availableDays,
    requiredDays: candidate.requiredDays,
    eligible: candidate.eligible,
    inRegion: candidate.inRegion,
  }));
}
