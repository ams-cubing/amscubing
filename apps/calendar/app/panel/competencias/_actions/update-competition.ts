"use server";

import { db } from "@workspace/db";
import {
  competitionNotificationRow,
  formatInternalStatusLabel,
  formatPublicStatusLabel,
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
import { Resend } from "resend";
import { z } from "zod";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { updateCompetitionSchema } from "../../_lib/validations";
import { notificationAppUrls } from "@/lib/notification-urls";
import { requireDelegate } from "@/lib/session";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function updateCompetition(
  competitionId: number,
  data: z.infer<typeof updateCompetitionSchema>,
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
    const validatedData = updateCompetitionSchema.parse(data);

    const startDateStr = validatedData.startDate.toISOString().split("T")[0];
    const endDateStr = validatedData.endDate.toISOString().split("T")[0];

    // Fetch existing trelloUrl to detect changes
    const existingCompetition = await db.query.competitions.findFirst({
      where: (c, { eq }) => eq(c.id, competitionId),
      columns: {
        trelloUrl: true,
        trelloAssignedAt: true,
        statusPublic: true,
        statusInternal: true,
        city: true,
      },
    });

    const newTrelloUrl = validatedData.trelloUrl || null;
    const trelloUrlChanged = existingCompetition?.trelloUrl !== newTrelloUrl;

    // Fetch existing delegate assignments so we can detect added/removed delegates
    const existingDelegatesRows = await db.query.competitionDelegates.findMany({
      where: (cd, { eq }) => eq(cd.competitionId, competitionId),
      columns: { delegateWcaId: true },
    });

    const previousDelegateWcaIds = existingDelegatesRows.map(
      (r) => r.delegateWcaId,
    );
    const newDelegateWcaIds = validatedData.delegateWcaIds;
    const addedDelegateWcaIds = newDelegateWcaIds.filter(
      (id) => !previousDelegateWcaIds.includes(id),
    );
    const removedDelegateWcaIds = previousDelegateWcaIds.filter(
      (id) => !newDelegateWcaIds.includes(id),
    );

    const existingOrganizersRows = await db.query.competitionOrganizers.findMany(
      {
        where: (co, { eq }) => eq(co.competitionId, competitionId),
        columns: { organizerWcaId: true },
      },
    );

    const previousOrganizerWcaIds = existingOrganizersRows.map(
      (r) => r.organizerWcaId,
    );
    const newOrganizerWcaIds = validatedData.organizerWcaIds;
    const addedOrganizerWcaIds = newOrganizerWcaIds.filter(
      (id) => !previousOrganizerWcaIds.includes(id),
    );
    const removedOrganizerWcaIds = previousOrganizerWcaIds.filter(
      (id) => !newOrganizerWcaIds.includes(id),
    );

    const publicChanged =
      existingCompetition?.statusPublic !== validatedData.statusPublic;
    const internalChanged =
      existingCompetition?.statusInternal !== validatedData.statusInternal;

    // Use a transaction for all DB changes
    await db.transaction(async (tx) => {
      // Update the competition
      const updatePayload = {
        name: validatedData.name || null,
        city: validatedData.city,
        stateId: validatedData.stateId,
        trelloUrl: newTrelloUrl,
        wcaCompetitionUrl: validatedData.wcaCompetitionUrl || null,
        capacity: validatedData.capacity || 0,
        startDate: startDateStr!,
        endDate: endDateStr!,
        statusPublic: validatedData.statusPublic,
        statusInternal: validatedData.statusInternal,
        trelloAssignedAt: existingCompetition?.trelloAssignedAt,
        notes: validatedData.notes || null,
        updatedAt: new Date(),
      };

      // If trelloUrl changed, set trelloAssignedAt to now
      if (trelloUrlChanged) {
        updatePayload.trelloAssignedAt = new Date();
      }

      await tx
        .update(competitions)
        .set(updatePayload)
        .where(eq(competitions.id, competitionId));

      // Delete existing delegate assignments
      await tx
        .delete(competitionDelegates)
        .where(eq(competitionDelegates.competitionId, competitionId));

      // Insert new delegate assignments
      const delegateAssignments = validatedData.delegateWcaIds.map((wcaId) => ({
        competitionId: competitionId,
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

      // Delete existing organizer assignments
      await tx
        .delete(competitionOrganizers)
        .where(eq(competitionOrganizers.competitionId, competitionId));

      // Insert new organizer assignments
      const organizerAssignments = validatedData.organizerWcaIds.map(
        (wcaId) => ({
          competitionId: competitionId,
          organizerWcaId: wcaId,
          isPrimary: wcaId === validatedData.primaryOrganizerWcaId,
        }),
      );

      if (organizerAssignments.length > 0) {
        await tx.insert(competitionOrganizers).values(organizerAssignments);
      }

      await tx.insert(logs).values({
        action: "update_competition",
        targetType: "competition",
        targetId: String(competitionId),
        actorId: session.user.id,
        details: validatedData,
      });

      const usersByWca = await userIdsByWcaIds(tx, [
        ...addedDelegateWcaIds,
        ...removedDelegateWcaIds,
        ...addedOrganizerWcaIds,
        ...removedOrganizerWcaIds,
        ...newDelegateWcaIds,
        ...newOrganizerWcaIds,
      ]);
      const urls = notificationAppUrls();
      const assignedRecipientIds = new Set<string>();
      const city = validatedData.city;

      const assignmentRows = (
        [
          [addedDelegateWcaIds, "delegate_added"],
          [removedDelegateWcaIds, "delegate_removed"],
          [addedOrganizerWcaIds, "organizer_added"],
          [removedOrganizerWcaIds, "organizer_removed"],
        ] as const
      ).flatMap(([wcaIds, type]) =>
        wcaIds.flatMap((wcaId) => {
          const recipient = usersByWca.get(wcaId);
          if (!recipient) return [];
          assignedRecipientIds.add(recipient.id);
          return [
            competitionNotificationRow({
              recipient,
              actorId: session.user.id,
              type,
              urls,
              competitionId,
              city,
            }),
          ];
        }),
      );

      const statusRows =
        publicChanged || internalChanged
          ? [...new Set([...newDelegateWcaIds, ...newOrganizerWcaIds])].flatMap(
              (wcaId) => {
                const recipient = usersByWca.get(wcaId);
                if (!recipient || assignedRecipientIds.has(recipient.id)) {
                  return [];
                }
                const statusLabel = publicChanged
                  ? formatPublicStatusLabel(validatedData.statusPublic)
                  : formatInternalStatusLabel(validatedData.statusInternal);
                return [
                  competitionNotificationRow({
                    recipient,
                    actorId: session.user.id,
                    type: "competition_status_changed",
                    urls,
                    competitionId,
                    city,
                    statusLabel,
                    statusPublic: validatedData.statusPublic,
                    statusInternal: validatedData.statusInternal,
                  }),
                ];
              },
            )
          : [];

      await insertNotifications(tx, [...assignmentRows, ...statusRows]);
    });

    // Notify newly added delegates
    try {
      if (addedDelegateWcaIds.length > 0) {
        const addedUsers = await db.query.user.findMany({
          where: (u, { inArray }) => inArray(u.wcaId, addedDelegateWcaIds),
          columns: { email: true, name: true },
        });

        for (const a of addedUsers) {
          if (!a.email) continue;
          try {
            await resend.emails.send({
              from: "Asociación Mexicana de Speedcubing <no-reply@amscubing.org>",
              to: a.email,
              subject: `Asignación como delegado: ${validatedData.city} (${startDateStr} - ${endDateStr})`,
              html: `
              <p>Hola ${a.name},</p>
              <p>Has sido asignado como delegado para la competencia en ${validatedData.city} (${startDateStr} - ${endDateStr}).</p>
              <p><a href="${process.env.BETTER_AUTH_URL}/panel">Revisa el panel de competencias para más detalles</a></p>
              `,
            });
          } catch (err) {
            console.error(
              "Error sending added delegate email via Resend:",
              err,
            );
          }
        }
      }

      // Notify removed delegates
      if (removedDelegateWcaIds.length > 0) {
        const removedUsers = await db.query.user.findMany({
          where: (u, { inArray }) => inArray(u.wcaId, removedDelegateWcaIds),
          columns: { email: true, name: true },
        });

        for (const r of removedUsers) {
          if (!r.email) continue;
          try {
            await resend.emails.send({
              from: "Asociación Mexicana de Speedcubing <no-reply@amscubing.org>",
              to: r.email,
              subject: `Remoción como delegado: ${validatedData.city} (${startDateStr} - ${endDateStr})`,
              html: `
              <p>Hola ${r.name},</p>
              <p>Has sido removido como delegado de una competencia en ${validatedData.city} (${startDateStr} - ${endDateStr}).</p>
              <p><a href="${process.env.BETTER_AUTH_URL}/panel">Revisa el panel de competencias para más detalles</a></p>
              `,
            });
          } catch (err) {
            console.error(
              "Error sending removed delegate email via Resend:",
              err,
            );
          }
        }
      }
    } catch (err) {
      console.error("Error notifying delegates:", err);
    }

    revalidateTag(`competition-${competitionId}`, "days");
    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidateTag("competition-state-counts", "days");
    revalidateTag("competition-delegates-counts", "days");
    revalidatePath("/panel/competencias", "layout");
    revalidatePath("/panel");
    revalidatePath("/");

    return {
      success: true,
      message: "Competencia actualizada exitosamente",
    };
  } catch (error) {
    console.error("Error updating competition:", error);
    return {
      success: false,
      message: "Error al actualizar la competencia",
    };
  }
}
