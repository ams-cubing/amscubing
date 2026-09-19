"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";
import {
  completeInstagramAnnouncement,
  getTorneoDeRubikCoverStatus,
  publishCompetitionSocialAnnouncement,
  refreshTorneoDeRubikCover,
  refreshTorneoDeRubikCoverBestEffort,
  generateTorneoDeRubikCoverPng,
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

async function loadAnnouncedCompetition(competitionId: number) {
  return db.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: {
      id: true,
      name: true,
      city: true,
      startDate: true,
      endDate: true,
      capacity: true,
      statusPublic: true,
      wcaCompetitionUrl: true,
      facebookPostId: true,
      instagramMediaId: true,
      socialPublishedManually: true,
      socialCustomText: true,
      socialTags: true,
      socialFlyerUrl: true,
    },
    with: {
      state: { columns: { name: true } },
    },
  });
}

export async function retrySocialPublish(
  competitionId: number,
): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const competition = await loadAnnouncedCompetition(competitionId);

  if (!competition || competition.statusPublic !== "announced") {
    return {
      ok: false,
      message: "Solo se puede publicar competencias anunciadas",
    };
  }

  if (competition.socialPublishedManually) {
    return {
      ok: false,
      message: "Esta competencia ya está marcada como publicada manualmente",
    };
  }

  if (competition.facebookPostId) {
    return {
      ok: false,
      message:
        "Ya hay una publicación en Facebook. Usa Completar Instagram si falta IG.",
    };
  }

  if (!competition.wcaCompetitionUrl?.trim()) {
    return {
      ok: false,
      message: "La competencia no tiene URL de la WCA",
    };
  }

  const published = await publishCompetitionSocialAnnouncement({
    wcaCompetitionUrl: competition.wcaCompetitionUrl,
    city: competition.city,
    stateName: competition.state?.name ?? null,
    name: competition.name,
    startDate: competition.startDate,
    endDate: competition.endDate,
    capacity: competition.capacity,
    socialCustomText: competition.socialCustomText ?? "",
    socialTags: competition.socialTags,
    socialFlyerUrl: competition.socialFlyerUrl,
  });

  if (!published.ok) {
    return { ok: false, message: published.message };
  }

  await db
    .update(competitions)
    .set({
      wcaCompetitionUrl: published.wcaCompetitionUrl,
      facebookPostId: published.facebookPostId,
      instagramMediaId: published.instagramMediaId,
      socialPublishedManually: false,
      announcedPostedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competitionId));

  revalidateSocial();
  await refreshTorneoDeRubikCoverBestEffort();
  return {
    ok: true,
    message: published.instagramMediaId
      ? "Publicado en Facebook e Instagram"
      : "Publicado en Facebook (sin imagen: Instagram omitido)",
  };
}

export async function completeInstagramPublish(
  competitionId: number,
): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const competition = await loadAnnouncedCompetition(competitionId);

  if (!competition || competition.statusPublic !== "announced") {
    return {
      ok: false,
      message: "Solo se puede completar Instagram en competencias anunciadas",
    };
  }

  if (!competition.facebookPostId) {
    return {
      ok: false,
      message: "Primero publica en Facebook con Reintentar publicación",
    };
  }

  if (competition.instagramMediaId) {
    return { ok: false, message: "Ya hay una publicación en Instagram" };
  }

  if (!competition.wcaCompetitionUrl?.trim()) {
    return {
      ok: false,
      message: "La competencia no tiene URL de la WCA",
    };
  }

  const published = await completeInstagramAnnouncement({
    wcaCompetitionUrl: competition.wcaCompetitionUrl,
    city: competition.city,
    stateName: competition.state?.name ?? null,
    name: competition.name,
    startDate: competition.startDate,
    endDate: competition.endDate,
    capacity: competition.capacity,
    socialCustomText: competition.socialCustomText ?? "",
    socialTags: competition.socialTags,
    socialFlyerUrl: competition.socialFlyerUrl,
  });

  if (!published.ok) {
    return { ok: false, message: published.message };
  }

  await db
    .update(competitions)
    .set({
      instagramMediaId: published.instagramMediaId,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competitionId));

  revalidateSocial();
  return { ok: true, message: "Instagram publicado" };
}

export async function markAsManuallyPublished(
  competitionId: number,
): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const competition = await loadAnnouncedCompetition(competitionId);

  if (!competition || competition.statusPublic !== "announced") {
    return {
      ok: false,
      message:
        "Solo se puede marcar como publicada manualmente competencias anunciadas",
    };
  }

  if (competition.facebookPostId) {
    return {
      ok: false,
      message: "Ya hay una publicación en Facebook vía Meta",
    };
  }

  if (competition.socialPublishedManually) {
    return {
      ok: false,
      message: "Ya está marcada como publicada manualmente",
    };
  }

  await db
    .update(competitions)
    .set({
      socialPublishedManually: true,
      announcedPostedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competitionId));

  revalidateSocial();
  return { ok: true, message: "Marcada como publicada manualmente" };
}
