"use server";

import { db } from "@workspace/db";
import { applyStatusTransition } from "@workspace/db/competition-transitions";
import { competitionOrganizersOnly } from "@workspace/db/notifications";
import { competitionDelegates, competitions } from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { sendCompetitionStatusChangedEmail } from "@/lib/calendar-emails";
import { restoreAvailability } from "@/lib/availability-dates";
import { notificationAppUrls } from "@/lib/notification-urls";
import { getErrorMessage } from "@/lib/handle-error";
import { requireDelegate } from "@/lib/session";

export async function cancelCompetition(competitionId: number): Promise<{
  success: boolean;
  message: string;
}> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }
  const { session } = authResult;

  try {
    const applied = await db.transaction(async (tx) => {
      const competition = await tx.query.competitions.findFirst({
        where: eq(competitions.id, competitionId),
        columns: {
          startDate: true,
          endDate: true,
        },
      });

      if (competition) {
        const activeDelegates = await tx.query.competitionDelegates.findMany({
          where: and(
            eq(competitionDelegates.competitionId, competitionId),
            inArray(competitionDelegates.status, ["pending", "accepted"]),
          ),
          columns: { delegateWcaId: true },
        });

        for (const row of activeDelegates) {
          await restoreAvailability(
            tx,
            row.delegateWcaId,
            competition.startDate,
            competition.endDate,
          );
        }
      }

      return applyStatusTransition(tx, {
        competitionId,
        actorId: session.user.id,
        transitionId: "cancel",
        source: "calendar",
        urls: notificationAppUrls(),
      });
    });

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
    revalidatePath("/panel");
    revalidatePath("/");

    return { success: true, message: "Competencia cancelada exitosamente" };
  } catch (error) {
    console.error("Error cancelling competition:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}
