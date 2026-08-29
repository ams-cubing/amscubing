"use server";

import { db } from "@workspace/db";
import {
  competitionNotificationRow,
  insertNotifications,
  userIdsByWcaIds,
} from "@workspace/db/notifications";
import {
  competitions,
  competitionDelegates,
  competitionOrganizers,
  logs,
  availability,
} from "@workspace/db/schema";
import { and, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { sendDelegateAssignedEmail } from "@/lib/calendar-emails";
import { getErrorMessage } from "@/lib/handle-error";
import { createCompetitionSchema } from "../../_lib/validations";
import { notificationAppUrls } from "@/lib/notification-urls";
import { requireDelegate } from "@/lib/session";
import { isBoardsEnabled } from "@/lib/boards";
import { assignBoardToCompetitionById } from "./assign-board";

export async function createCompetition(
  data: z.infer<typeof createCompetitionSchema>,
): Promise<{
  success: boolean;
  message: string;
  competitionId?: number;
}> {
  try {
    const authResult = await requireDelegate();
    if (!authResult.ok) {
      return { success: false, message: authResult.message };
    }
    const { session } = authResult;

    // Validate input
    const validatedData = createCompetitionSchema.parse(data);

    const startDateStr = validatedData.startDate.toISOString().split("T")[0];
    const endDateStr = validatedData.endDate.toISOString().split("T")[0];

    let newCompetitionId: number | undefined;

    const trelloUrl = validatedData.trelloUrl;
    const trelloAssignedAt = trelloUrl ? new Date() : null;

    // All DB changes in a transaction
    await db.transaction(async (tx) => {
      const [newCompetition] = await tx
        .insert(competitions)
        .values({
          name: validatedData.name || null,
          city: validatedData.city,
          stateId: validatedData.stateId,
          requestedBy: null,
          trelloUrl: validatedData.trelloUrl || null,
          wcaCompetitionUrl: validatedData.wcaCompetitionUrl || null,
          capacity: validatedData.capacity || 0,
          startDate: startDateStr!,
          endDate: endDateStr!,
          statusPublic: validatedData.statusPublic,
          statusInternal: validatedData.statusInternal,
          trelloAssignedAt: trelloAssignedAt,
          notes: validatedData.notes || null,
        })
        .returning();

      newCompetitionId = newCompetition!.id;

      const delegateAssignments = validatedData.delegateWcaIds.map((wcaId) => ({
        competitionId: newCompetitionId,
        delegateWcaId: wcaId,
        isPrimary: wcaId === validatedData.primaryDelegateWcaId,
      }));

      if (delegateAssignments.length > 0) {
        await tx.insert(competitionDelegates).values(delegateAssignments);

        // Remove availability entries for assigned delegates for the competition date range
        await tx
          .delete(availability)
          .where(
            and(
              inArray(availability.userWcaId, validatedData.delegateWcaIds),
              gte(availability.date, startDateStr!),
              lte(availability.date, endDateStr!),
            ),
          );
      }

      const organizerAssignments = validatedData.organizerWcaIds.map(
        (wcaId) => ({
          competitionId: newCompetitionId,
          organizerWcaId: wcaId,
          isPrimary: wcaId === validatedData.primaryOrganizerWcaId,
        }),
      );

      if (organizerAssignments.length > 0) {
        await tx.insert(competitionOrganizers).values(organizerAssignments);
      }

      await tx.insert(logs).values({
        action: "create_competition",
        targetType: "competition",
        targetId: String(newCompetitionId),
        actorId: session.user.id,
        details: validatedData,
      });

      const usersByWca = await userIdsByWcaIds(tx, [
        ...validatedData.delegateWcaIds,
        ...validatedData.organizerWcaIds,
      ]);
      const urls = notificationAppUrls();
      await insertNotifications(tx, [
        ...validatedData.delegateWcaIds.flatMap((wcaId) => {
          const recipient = usersByWca.get(wcaId);
          if (!recipient) return [];
          return [
            competitionNotificationRow({
              recipient,
              actorId: session.user.id,
              type: "delegate_added",
              urls,
              competitionId: newCompetitionId!,
              city: validatedData.city,
            }),
          ];
        }),
        ...validatedData.organizerWcaIds.flatMap((wcaId) => {
          const recipient = usersByWca.get(wcaId);
          if (!recipient) return [];
          return [
            competitionNotificationRow({
              recipient,
              actorId: session.user.id,
              type: "organizer_added",
              urls,
              competitionId: newCompetitionId!,
              city: validatedData.city,
            }),
          ];
        }),
      ]);
    });

    try {
      const delegates = await db.query.user.findMany({
        where: (u, { inArray }) =>
          inArray(u.wcaId, validatedData.delegateWcaIds),
        columns: { email: true, name: true },
      });

      for (const d of delegates) {
        if (!d.email || !d.name) continue;
        try {
          await sendDelegateAssignedEmail({
            to: d.email,
            recipientName: d.name,
            city: validatedData.city,
            startDate: startDateStr!,
            endDate: endDateStr!,
          });
        } catch (err) {
          console.error("Error sending delegate email via Resend:", err);
        }
      }
    } catch (err) {
      console.error("Error fetching delegate emails:", err);
    }

    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidateTag("competition-state-counts", "days");
    revalidateTag("competition-delegates-counts", "days");
    revalidatePath("/panel");
    revalidatePath("/");

    let message = "Competencia creada exitosamente";

    if (validatedData.assignBoard && isBoardsEnabled() && newCompetitionId) {
      const assignResult = await assignBoardToCompetitionById(newCompetitionId);
      if (assignResult.error) {
        message = `Competencia creada, pero no se pudo asignar el tablero: ${assignResult.error}`;
      } else {
        message = "Competencia y tablero creados exitosamente";
      }
    }

    return {
      success: true,
      message,
      competitionId: newCompetitionId,
    };
  } catch (error) {
    console.error("Error creating competition:", error);
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}
