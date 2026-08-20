"use server";

import { db } from "@workspace/db";
import {
  competitionNotificationRow,
  competitionTeamUsers,
  formatPublicStatusLabel,
  insertNotifications,
} from "@workspace/db/notifications";
import { competitions, logs } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { notificationAppUrls } from "@/lib/notification-urls";
import { requireDelegate } from "@/lib/session";

export async function markAsAnnounced(competitionId: number): Promise<{
  success: boolean;
  message: string;
}> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }
  const { session } = authResult;

  try {
    await db.transaction(async (tx) => {
      const competition = await tx.query.competitions.findFirst({
        where: eq(competitions.id, competitionId),
        columns: {
          city: true,
          statusPublic: true,
          statusInternal: true,
        },
      });

      if (!competition) {
        throw new Error("Competition not found");
      }

      if (competition.statusPublic === "announced") {
        throw new Error("La competencia ya está anunciada");
      }

      if (
        competition.statusPublic === "suspended" ||
        competition.statusInternal === "cancelled"
      ) {
        throw new Error("No se puede anunciar una competencia cancelada");
      }

      await tx
        .update(competitions)
        .set({
          statusPublic: "announced",
          statusInternal: "wca_approved",
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
            city: competition.city ?? "",
            statusLabel: formatPublicStatusLabel("announced"),
            statusPublic: "announced",
            statusInternal: "wca_approved",
          }),
        ),
      );
    });

    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidatePath("/panel");
    revalidatePath("/");

    return { success: true, message: "Competencia marcada como anunciada" };
  } catch (error) {
    console.error("Error marking competition as announced:", error);
    if (error instanceof Error && error.message.includes("competencia")) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Error al anunciar la competencia" };
  }
}
