"use server";

import { z } from "zod";
import { db } from "@workspace/db";
import {
  competitionNotificationRow,
  insertNotifications,
  userIdsByWcaIds,
} from "@workspace/db/notifications";
import {
  competitionOrganizers,
  competitions,
  logs,
  user,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { sendUltimatumEmail } from "@/lib/calendar-emails";
import { notificationAppUrls } from "@/lib/notification-urls";
import { getErrorMessage } from "@/lib/handle-error";
import { requireDelegate } from "@/lib/session";

const createUltimatumSchema = z.object({
  competitionId: z.number(),
  deadline: z.date(),
  message: z.string().optional().or(z.literal("")),
});

export async function sendUltimatum(
  data: z.infer<typeof createUltimatumSchema>,
) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }
  const { session } = authResult;

  // Validate input
  const validatedData = createUltimatumSchema.parse(data);

  try {
    await db.transaction(async (tx) => {
      const competition = await tx.query.competitions.findFirst({
        where: eq(competitions.id, validatedData.competitionId),
        columns: { city: true },
      });

      await tx
        .update(competitions)
        .set({
          ultimatumSetTo: validatedData.deadline,
        })
        .where(eq(competitions.id, validatedData.competitionId));

      await tx.insert(logs).values({
        action: "send_ultimatum",
        targetType: "competition",
        targetId: String(validatedData.competitionId),
        actorId: session.user.id,
        details: validatedData,
      });

      const organizerRows = await tx
        .select({
          organizerWcaId: competitionOrganizers.organizerWcaId,
        })
        .from(competitionOrganizers)
        .where(
          eq(competitionOrganizers.competitionId, validatedData.competitionId),
        );
      const usersByWca = await userIdsByWcaIds(
        tx,
        organizerRows.map((row) => row.organizerWcaId),
      );
      const urls = notificationAppUrls();
      await insertNotifications(
        tx,
        [...usersByWca.values()].map((recipient) =>
          competitionNotificationRow({
            recipient,
            actorId: session.user.id,
            type: "ultimatum_sent",
            urls,
            competitionId: validatedData.competitionId,
            city: competition?.city ?? "",
          }),
        ),
      );
    });

    const organizers = await db
      .select({
        email: user.email,
      })
      .from(competitionOrganizers)
      .innerJoin(user, eq(user.wcaId, competitionOrganizers.organizerWcaId))
      .where(
        and(
          eq(competitionOrganizers.competitionId, validatedData.competitionId),
        ),
      );

    for (const organizer of organizers) {
      const email = organizer?.email;
      if (!email) continue;

      await sendUltimatumEmail({
        to: email,
        deadline: validatedData.deadline,
        message: validatedData.message,
      });
    }

    revalidateTag("competitions", "days");
    revalidatePath("/panel");
  } catch (error) {
    return { success: false, message: getErrorMessage(error) };
  }

  return { success: true };
}
