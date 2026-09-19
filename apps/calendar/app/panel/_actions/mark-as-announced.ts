"use server";

import { db } from "@workspace/db";
import {
  competitionNotificationRow,
  competitionOrganizersOnly,
  competitionTeamUsers,
  formatPublicStatusLabel,
  insertNotifications,
} from "@workspace/db/notifications";
import { competitions, logs } from "@workspace/db/schema";
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

    if (competition.statusPublic === "announced") {
      return { success: false, message: "La competencia ya está anunciada" };
    }

    if (
      competition.statusPublic === "suspended" ||
      competition.statusInternal === "cancelled"
    ) {
      return {
        success: false,
        message: "No se puede anunciar una competencia cancelada",
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
      return { success: false, message: published.message };
    }

    const city = competition.city;

    await db.transaction(async (tx) => {
      await tx
        .update(competitions)
        .set({
          statusPublic: "announced",
          statusInternal: "wca_approved",
          wcaCompetitionUrl: published.wcaCompetitionUrl,
          announcedPostedAt: new Date(),
          facebookPostId: published.facebookPostId,
          instagramMediaId: published.instagramMediaId,
          updatedAt: new Date(),
        })
        .where(eq(competitions.id, competitionId));

      await tx.insert(logs).values({
        action: "update_competition",
        targetType: "competition",
        targetId: String(competitionId),
        actorId: session.user.id,
        details: {
          statusPublic: "announced",
          statusInternal: "wca_approved",
          facebookPostId: published.facebookPostId,
          instagramMediaId: published.instagramMediaId,
        },
      });

      const team = await competitionTeamUsers(tx, competitionId);
      const urls = notificationAppUrls();
      await insertNotifications(
        tx,
        team.map((recipient) =>
          competitionNotificationRow({
            recipient,
            actorId: session.user.id,
            type: "competition_status_changed",
            urls,
            competitionId,
            city,
            statusLabel: formatPublicStatusLabel("announced"),
            statusPublic: "announced",
            statusInternal: "wca_approved",
          }),
        ),
      );
    });

    const statusLabel = formatPublicStatusLabel("announced");
    try {
      const organizers = await competitionOrganizersOnly(db, competitionId);
      for (const organizer of organizers) {
        if (!organizer.email || !organizer.name) continue;
        if (organizer.id === session.user.id) continue;
        try {
          await sendCompetitionStatusChangedEmail({
            to: organizer.email,
            recipientName: organizer.name,
            city,
            statusLabel,
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
    revalidatePath("/panel");
    revalidatePath("/");

    await refreshTorneoDeRubikCoverBestEffort();

    return {
      success: true,
      message: "Competencia anunciada y publicada en Facebook e Instagram",
    };
  } catch (error) {
    console.error("Error marking competition as announced:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}
