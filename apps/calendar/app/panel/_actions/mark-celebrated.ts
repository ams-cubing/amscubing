"use server";

import { db } from "@workspace/db";
import { applyStatusTransition } from "@workspace/db/competition-transitions";
import { competitionOrganizersOnly } from "@workspace/db/notifications";
import { revalidatePath, revalidateTag } from "next/cache";
import { sendCompetitionStatusChangedEmail } from "@/lib/calendar-emails";
import { notificationAppUrls } from "@/lib/notification-urls";
import { getErrorMessage } from "@/lib/handle-error";
import { requireDelegate } from "@/lib/session";

export async function markAsCelebrated(competitionId: number): Promise<{
  success: boolean;
  message: string;
}> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }
  const { session } = authResult;

  try {
    const applied = await db.transaction(async (tx) =>
      applyStatusTransition(tx, {
        competitionId,
        actorId: session.user.id,
        transitionId: "celebrate",
        source: "calendar",
        urls: notificationAppUrls(),
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

    return { success: true, message: "Competencia marcada como celebrada" };
  } catch (error) {
    console.error("Error marking competition as celebrated:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}
