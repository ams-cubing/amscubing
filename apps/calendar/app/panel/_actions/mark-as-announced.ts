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
  claimCompetitionSocialPublish,
  publishCompetitionSocialAnnouncement,
  refreshTorneoDeRubikCoverBestEffort,
  releaseCompetitionSocialPublish,
  SOCIAL_PUBLISH_CLAIM_REJECT_MESSAGE,
} from "@workspace/social";
import { sendCompetitionStatusChangedEmail } from "@/lib/calendar-emails";
import { notificationAppUrls } from "@/lib/notification-urls";
import { getErrorMessage } from "@/lib/handle-error";
import { requireDelegate } from "@/lib/session";
import { log } from "@workspace/server/log";

export async function markAsAnnounced(
  competitionId: number,
  options?: { wcaCompetitionUrl?: string },
): Promise<{
  success: boolean;
  message: string;
  /** The row changed since the client loaded it; the caller should refresh. */
  stale?: boolean;
}> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }
  const { session } = authResult;

  let claimed = false;

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
        facebookPostId: true,
        instagramMediaId: true,
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
      return { success: false, message: getErrorMessage(err), stale: true };
    }

    let social: {
      wcaCompetitionUrl: string | null;
      facebookPostId: string;
      instagramMediaId: string | null;
    };

    if (competition.facebookPostId) {
      // A previous attempt already posted but never finished the transition.
      social = {
        wcaCompetitionUrl: competition.wcaCompetitionUrl,
        facebookPostId: competition.facebookPostId,
        instagramMediaId: competition.instagramMediaId,
      };
    } else {
      claimed = await claimCompetitionSocialPublish(competitionId);
      if (!claimed) {
        return {
          success: false,
          message: SOCIAL_PUBLISH_CLAIM_REJECT_MESSAGE,
          stale: true,
        };
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
        await releaseCompetitionSocialPublish(competitionId);
        claimed = false;
        return { success: false, message: published.message };
      }

      social = {
        wcaCompetitionUrl: published.wcaCompetitionUrl,
        facebookPostId: published.facebookPostId,
        instagramMediaId: published.instagramMediaId,
      };

      // Persist post ids before the transition so a later failure can't cause a repost.
      await db
        .update(competitions)
        .set({
          wcaCompetitionUrl: social.wcaCompetitionUrl,
          facebookPostId: social.facebookPostId,
          instagramMediaId: social.instagramMediaId,
          announcedPostedAt: new Date(),
          socialPublishClaimedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(competitions.id, competitionId));
      claimed = false;
    }

    const applied = await db.transaction(async (tx) =>
      applyStatusTransition(tx, {
        competitionId,
        actorId: session.user.id,
        transitionId: "announce",
        source: "calendar",
        urls: notificationAppUrls(),
        patch: {
          wcaCompetitionUrl: social.wcaCompetitionUrl,
          announcedPostedAt: competition.announcedPostedAt ?? new Date(),
          facebookPostId: social.facebookPostId,
          instagramMediaId: social.instagramMediaId,
        },
        extraLogDetails: {
          facebookPostId: social.facebookPostId,
          instagramMediaId: social.instagramMediaId,
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
          log.error("calendar.organizer_status_email_failed", { error: err });
        }
      }
    } catch (err) {
      log.error("calendar.notify_organizers_failed", { error: err });
    }

    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidatePath("/panel/competencias");
    revalidatePath(`/panel/competencias/${competitionId}`);
    revalidatePath("/panel");
    revalidatePath("/");

    await refreshTorneoDeRubikCoverBestEffort();

    return {
      success: true,
      message: social.instagramMediaId
        ? "Competencia anunciada y publicada en Facebook e Instagram"
        : "Competencia anunciada y publicada en Facebook (sin imagen: Instagram omitido)",
    };
  } catch (error) {
    log.error("calendar.mark_announced_failed", { error });
    if (claimed) {
      try {
        await releaseCompetitionSocialPublish(competitionId);
      } catch (releaseError) {
        log.error("calendar.social_claim_release_failed", {
          error: releaseError,
        });
      }
    }
    return { success: false, message: getErrorMessage(error) };
  }
}
