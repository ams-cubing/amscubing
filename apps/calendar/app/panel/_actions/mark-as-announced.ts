"use server";

import { db } from "@workspace/db";
import {
  applyStatusTransition,
  assertCanApply,
} from "@workspace/db/competition-transitions";
import { competitionOrganizersOnly } from "@workspace/db/notifications";
import { competitions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  publishCompetitionSocialAnnouncement,
  refreshTorneoDeRubikCoverBestEffort,
} from "@workspace/social";
import { sendCompetitionStatusChangedEmail } from "@/lib/calendar-emails";
import { notificationAppUrls } from "@/lib/notification-urls";
import { getErrorMessage } from "@/lib/handle-error";
import { requireDelegate } from "@/lib/session";

export async function markAsAnnounced(
  competitionId: number,
  options?: { wcaCompetitionUrl?: string },
): Promise<{
  success: boolean;
  message: string;
}> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }
  const { session } = authResult;

  try {
    const competition = await db.query.competitions.findFirst({
      where: eq(competitions.id, competitionId),
      columns: {
        city: true,
        name: true,
        startDate: true,
        endDate: true,
        capacity: true,
        statusPublic: true,
        statusInternal: true,
        wcaCompetitionUrl: true,
        announcedPostedAt: true,
        socialCustomText: true,
        socialTags: true,
        socialFlyerUrl: true,
      },
      with: {
        state: { columns: { name: true } },
      },
    });

    if (!competition) {
      return { success: false, message: "Competencia no encontrada" };
    }

    try {
      assertCanApply("announce", {
        statusPublic: competition.statusPublic,
        statusInternal: competition.statusInternal,
      });
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }

    const wcaCompetitionUrl =
      options?.wcaCompetitionUrl?.trim() ||
      competition.wcaCompetitionUrl?.trim() ||
      "";

    const published = await publishCompetitionSocialAnnouncement({
      wcaCompetitionUrl,
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
      return { success: false, message: published.message };
    }

    const applied = await db.transaction(async (tx) =>
      applyStatusTransition(tx, {
        competitionId,
        actorId: session.user.id,
        transitionId: "announce",
        source: "calendar",
        urls: notificationAppUrls(),
        patch: {
          wcaCompetitionUrl: published.wcaCompetitionUrl,
          announcedPostedAt: new Date(),
          facebookPostId: published.facebookPostId,
          instagramMediaId: published.instagramMediaId,
        },
        extraLogDetails: {
          facebookPostId: published.facebookPostId,
          instagramMediaId: published.instagramMediaId,
        },
      }),
    );

    try {
      const organizers = await competitionOrganizersOnly(db, competitionId);
      for (const organizer of organizers) {
        if (!organizer.email || !organizer.name) continue;
        if (organizer.id === session.user.id) continue;
        try {
          await sendCompetitionStatusChangedEmail({
            to: organizer.email,
            recipientName: organizer.name,
            city: applied.city,
            statusLabel: applied.statusLabel,
          });
        } catch (err) {
          console.error(
            "Error sending organizer status email via Resend:",
            err,
          );
        }
      }
    } catch (err) {
      console.error("Error notifying organizers:", err);
    }

    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidatePath("/panel/competencias");
    revalidatePath("/panel");
    revalidatePath("/");

    await refreshTorneoDeRubikCoverBestEffort();

    return {
      success: true,
      message: published.instagramMediaId
        ? "Competencia anunciada y publicada en Facebook e Instagram"
        : "Competencia anunciada y publicada en Facebook (sin imagen: Instagram omitido)",
    };
  } catch (error) {
    console.error("Error marking competition as announced:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}
