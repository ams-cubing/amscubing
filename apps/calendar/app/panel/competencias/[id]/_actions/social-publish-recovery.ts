"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import {
  completeCompetitionInstagramPublish,
  markCompetitionSocialPublishedManually,
  retryCompetitionSocialPublish,
  type CompetitionSocialMutationResult,
} from "@workspace/social";

import { requireDelegate } from "@/lib/session";

function revalidateCompetitionSocial(competitionId: number) {
  revalidateTag("competitions", "days");
  revalidatePath("/panel/competencias");
  revalidatePath("/panel");
  revalidatePath(`/panel/competencias/${competitionId}`);
  revalidatePath("/");
}

export async function retryCompetitionSocial(
  competitionId: number,
): Promise<CompetitionSocialMutationResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const result = await retryCompetitionSocialPublish(competitionId);
  if (result.ok) {
    revalidateCompetitionSocial(competitionId);
  }
  return result;
}

export async function completeCompetitionInstagram(
  competitionId: number,
): Promise<CompetitionSocialMutationResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const result = await completeCompetitionInstagramPublish(competitionId);
  if (result.ok) {
    revalidateCompetitionSocial(competitionId);
  }
  return result;
}

export async function markCompetitionSocialManual(
  competitionId: number,
): Promise<CompetitionSocialMutationResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const result = await markCompetitionSocialPublishedManually(competitionId);
  if (result.ok) {
    revalidateCompetitionSocial(competitionId);
  }
  return result;
}
