"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import {
  completeCompetitionInstagramPublish,
  generateTorneoDeRubikCoverPng,
  getTorneoDeRubikCoverStatus,
  markCompetitionSocialPublishedManually,
  refreshTorneoDeRubikCover,
  retryCompetitionSocialPublish,
} from "@workspace/social";

import type { AdminActionResult } from "@/app/admin/actions";
import type { FacebookCoverPanelStatus } from "@/app/admin/redes/facebook-cover-panel";
import { requireDelegate } from "@/lib/session";

function revalidateSocial() {
  revalidatePath("/admin/redes");
  revalidateTag("competitions", "days");
}

function toCoverPanelStatus(
  status: Awaited<ReturnType<typeof getTorneoDeRubikCoverStatus>>,
): FacebookCoverPanelStatus {
  return {
    status: status.status,
    slotCount: status.slotCount,
    uploadedAt: status.uploadedAt?.toISOString() ?? null,
  };
}

export async function refreshFacebookCover(options?: {
  force?: boolean;
}): Promise<
  | { ok: true; message: string; coverStatus: FacebookCoverPanelStatus }
  | { ok: false; message: string }
> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const result = await refreshTorneoDeRubikCover({ force: options?.force });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const coverStatus = toCoverPanelStatus(await getTorneoDeRubikCoverStatus());
  revalidatePath("/admin/redes");
  return { ok: true, message: result.message, coverStatus };
}

/** Returns a data URL for the current generated cover (admin preview). */
export async function previewFacebookCover(): Promise<
  | { ok: true; dataUrl: string; slotCount: number }
  | { ok: false; message: string }
> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const generated = await generateTorneoDeRubikCoverPng();
  if (!generated.ok) {
    return generated;
  }

  const dataUrl = `data:image/png;base64,${generated.png.toString("base64")}`;
  return {
    ok: true,
    dataUrl,
    slotCount: generated.slotCount,
  };
}

export async function retrySocialPublish(
  competitionId: number,
): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const result = await retryCompetitionSocialPublish(competitionId);
  if (result.ok) {
    revalidateSocial();
  }
  return result;
}

export async function completeInstagramPublish(
  competitionId: number,
): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const result = await completeCompetitionInstagramPublish(competitionId);
  if (result.ok) {
    revalidateSocial();
  }
  return result;
}

export async function markAsManuallyPublished(
  competitionId: number,
): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const result = await markCompetitionSocialPublishedManually(competitionId);
  if (result.ok) {
    revalidateSocial();
  }
  return result;
}
