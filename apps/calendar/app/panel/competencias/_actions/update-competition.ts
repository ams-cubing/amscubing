"use server";

import { db } from "@workspace/db";
import {
  resolveStatusChange,
  type ResolveStatusChangeResult,
} from "@workspace/db/competition-transitions";
import {
  competitionNotificationRow,
  formatInternalStatusLabel,
  formatPublicStatusLabel,
  insertNotifications,
  userIdsByWcaIds,
} from "@workspace/db/notifications";
import {
  boards,
  competitions,
  competitionDelegates,
  competitionOrganizers,
  logs,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import {
  sendCompetitionStatusChangedEmail,
  sendDelegateAssignedEmail,
  sendDelegateRemovedEmail,
  sendOrganizerAssignedEmail,
  sendOrganizerRemovedEmail,
} from "@/lib/calendar-emails";
import {
  publishCompetitionSocialAnnouncement,
  refreshTorneoDeRubikCoverBestEffort,
} from "@workspace/social";
import {
  holdAvailability,
  restoreAvailability,
  toDateOnlyString,
} from "@/lib/availability-dates";
import { getErrorMessage } from "@/lib/handle-error";
import { notificationAppUrls } from "@/lib/notification-urls";
import { requireDelegate } from "@/lib/session";
import { updateCompetitionSchema } from "../../_lib/validations";

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

    const startDateStr = toDateOnlyString(validatedData.startDate);
    const endDateStr = toDateOnlyString(validatedData.endDate);

    // Fetch existing trelloUrl to detect changes
    const existingCompetition = await db.query.competitions.findFirst({
      where: (c, { eq: eqFn }) => eqFn(c.id, competitionId),
      columns: {
        trelloUrl: true,
        trelloAssignedAt: true,
        statusPublic: true,
        statusInternal: true,
        city: true,
        capacity: true,
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

    const newTrelloUrl = validatedData.trelloUrl || null;
    const trelloUrlChanged = existingCompetition?.trelloUrl !== newTrelloUrl;

    // Fetch all existing delegate assignments (including declined) so we can
    // preserve pending status and decline history.
    const existingDelegatesRows = await db.query.competitionDelegates.findMany({
      where: (cd, { eq: eqFn }) => eqFn(cd.competitionId, competitionId),
      columns: { delegateWcaId: true, status: true, isPrimary: true },
    });

    const previousByWcaId = new Map(
      existingDelegatesRows.map((r) => [r.delegateWcaId, r]),
    );
    const previousActiveWcaIds = existingDelegatesRows
      .filter((r) => r.status !== "declined")
      .map((r) => r.delegateWcaId);
    const newDelegateWcaIds = validatedData.delegateWcaIds;
    const addedDelegateWcaIds = newDelegateWcaIds.filter(
      (id) => !previousActiveWcaIds.includes(id),
    );
    const removedDelegateWcaIds = previousActiveWcaIds.filter(
      (id) => !newDelegateWcaIds.includes(id),
    );

    const existingOrganizersRows =
      await db.query.competitionOrganizers.findMany({
        where: (co, { eq }) => eq(co.competitionId, competitionId),
        columns: { organizerWcaId: true },
      });

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

    let statusResolution: ResolveStatusChangeResult = { noop: true };
    let resolvedStatuses = {
      statusPublic: validatedData.statusPublic,
      statusInternal: validatedData.statusInternal,
    };

    if (existingCompetition && (publicChanged || internalChanged)) {
      statusResolution = resolveStatusChange(
        {
          statusPublic: existingCompetition.statusPublic,
          statusInternal: existingCompetition.statusInternal,
        },
        validatedData.statusPublic,
        validatedData.statusInternal,
      );
      if (!("noop" in statusResolution)) {
        resolvedStatuses = statusResolution.to;
      }
    }

    const transitioningToAnnounced =
      !("noop" in statusResolution) && statusResolution.id === "announce";
    const cancelling =
      !("noop" in statusResolution) && statusResolution.id === "cancel";

    let announcedSocial: {
      wcaCompetitionUrl: string;
      facebookPostId: string;
      instagramMediaId: string | null;
    } | null = null;

    if (transitioningToAnnounced && !existingCompetition?.announcedPostedAt) {
      const published = await publishCompetitionSocialAnnouncement({
        wcaCompetitionUrl: validatedData.wcaCompetitionUrl || "",
        city: validatedData.city,
        stateName: existingCompetition?.state?.name ?? null,
        name: validatedData.name || null,
        startDate: startDateStr!,
        endDate: endDateStr!,
        capacity: validatedData.capacity ?? existingCompetition?.capacity ?? 50,
        socialCustomText: existingCompetition?.socialCustomText ?? "",
        socialTags: existingCompetition?.socialTags,
        socialFlyerUrl: existingCompetition?.socialFlyerUrl,
      });
      if (!published.ok) {
        return { success: false, message: published.message };
      }
      announcedSocial = {
        wcaCompetitionUrl: published.wcaCompetitionUrl,
        facebookPostId: published.facebookPostId,
        instagramMediaId: published.instagramMediaId,
      };
    }

    // Use a transaction for all DB changes
    await db.transaction(async (tx) => {
      // Update the competition
      const updatePayload = {
        name: validatedData.name || null,
        city: validatedData.city,
        stateId: validatedData.stateId,
        trelloUrl: newTrelloUrl,
        wcaCompetitionUrl:
          announcedSocial?.wcaCompetitionUrl ||
          validatedData.wcaCompetitionUrl ||
          null,
        capacity: validatedData.capacity ?? 50,
        startDate: startDateStr!,
        endDate: endDateStr!,
        statusPublic: resolvedStatuses.statusPublic,
        statusInternal: resolvedStatuses.statusInternal,
        trelloAssignedAt: existingCompetition?.trelloAssignedAt,
        notes: validatedData.notes || null,
        updatedAt: new Date(),
        announcedPostedAt: existingCompetition?.announcedPostedAt ?? null,
        facebookPostId: existingCompetition?.facebookPostId ?? null,
        instagramMediaId: existingCompetition?.instagramMediaId ?? null,
      };

      if (announcedSocial) {
        updatePayload.announcedPostedAt = new Date();
        updatePayload.facebookPostId = announcedSocial.facebookPostId;
        updatePayload.instagramMediaId = announcedSocial.instagramMediaId;
      }

      // If trelloUrl changed, set trelloAssignedAt to now
      if (trelloUrlChanged) {
        updatePayload.trelloAssignedAt = new Date();
      }

      await tx
        .update(competitions)
        .set(updatePayload)
        .where(eq(competitions.id, competitionId));

      if (cancelling) {
        await tx
          .update(boards)
          .set({
            archivedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(boards.competitionId, competitionId));
      }

      // Delete existing delegate assignments
      await tx
        .delete(competitionDelegates)
        .where(eq(competitionDelegates.competitionId, competitionId));

      // Preserve pending/accepted for unchanged WCA IDs; new admin assigns → accepted.
      // Also keep declined history for rows not re-added (decline→next exclusions).
      const delegateAssignments = [
        ...validatedData.delegateWcaIds.map((wcaId) => {
          const previous = previousByWcaId.get(wcaId);
          const status =
            previous?.status === "pending"
              ? ("pending" as const)
              : ("accepted" as const);
          return {
            competitionId,
            delegateWcaId: wcaId,
            isPrimary: wcaId === validatedData.primaryDelegateWcaId,
            status,
          };
        }),
        ...existingDelegatesRows
          .filter(
            (r) =>
              r.status === "declined" &&
              !validatedData.delegateWcaIds.includes(r.delegateWcaId),
          )
          .map((r) => ({
            competitionId,
            delegateWcaId: r.delegateWcaId,
            isPrimary: false,
            status: "declined" as const,
          })),
      ];

      if (delegateAssignments.length > 0) {
        await tx.insert(competitionDelegates).values(delegateAssignments);
      }

      for (const wcaId of removedDelegateWcaIds) {
        const previous = previousByWcaId.get(wcaId);
        if (
          previous &&
          (previous.status === "pending" || previous.status === "accepted")
        ) {
          await restoreAvailability(tx, wcaId, startDateStr!, endDateStr!);
        }
      }

      for (const wcaId of addedDelegateWcaIds) {
        await holdAvailability(tx, wcaId, startDateStr!, endDateStr!);
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

      const statusChanged = !("noop" in statusResolution);
      const statusRows = statusChanged
        ? [...new Set([...newDelegateWcaIds, ...newOrganizerWcaIds])].flatMap(
            (wcaId) => {
              const recipient = usersByWca.get(wcaId);
              if (!recipient || assignedRecipientIds.has(recipient.id)) {
                return [];
              }
              const statusLabel =
                existingCompetition?.statusPublic !==
                resolvedStatuses.statusPublic
                  ? formatPublicStatusLabel(resolvedStatuses.statusPublic)
                  : formatInternalStatusLabel(resolvedStatuses.statusInternal);
              return [
                competitionNotificationRow({
                  recipient,
                  actorId: session.user.id,
                  type: "competition_status_changed",
                  urls,
                  competitionId,
                  city,
                  statusLabel,
                  statusPublic: resolvedStatuses.statusPublic,
                  statusInternal: resolvedStatuses.statusInternal,
                }),
              ];
            },
          )
        : [];

      await insertNotifications(tx, [...assignmentRows, ...statusRows]);
    });

    // Notify newly added/removed delegates and organizers; status to remaining organizers
    try {
      if (addedDelegateWcaIds.length > 0) {
        const addedUsers = await db.query.user.findMany({
          where: (u, { inArray }) => inArray(u.wcaId, addedDelegateWcaIds),
          columns: { email: true, name: true },
        });

        for (const a of addedUsers) {
          if (!a.email || !a.name) continue;
          try {
            await sendDelegateAssignedEmail({
              to: a.email,
              recipientName: a.name,
              city: validatedData.city,
              startDate: startDateStr!,
              endDate: endDateStr!,
            });
          } catch (err) {
            console.error(
              "Error sending added delegate email via Resend:",
              err,
            );
          }
        }
      }

      if (removedDelegateWcaIds.length > 0) {
        const removedUsers = await db.query.user.findMany({
          where: (u, { inArray }) => inArray(u.wcaId, removedDelegateWcaIds),
          columns: { email: true, name: true },
        });

        for (const r of removedUsers) {
          if (!r.email || !r.name) continue;
          try {
            await sendDelegateRemovedEmail({
              to: r.email,
              recipientName: r.name,
              city: validatedData.city,
              startDate: startDateStr!,
              endDate: endDateStr!,
            });
          } catch (err) {
            console.error(
              "Error sending removed delegate email via Resend:",
              err,
            );
          }
        }
      }

      if (addedOrganizerWcaIds.length > 0) {
        const addedUsers = await db.query.user.findMany({
          where: (u, { inArray }) => inArray(u.wcaId, addedOrganizerWcaIds),
          columns: { email: true, name: true },
        });

        for (const a of addedUsers) {
          if (!a.email || !a.name) continue;
          try {
            await sendOrganizerAssignedEmail({
              to: a.email,
              recipientName: a.name,
              city: validatedData.city,
              startDate: startDateStr!,
              endDate: endDateStr!,
            });
          } catch (err) {
            console.error(
              "Error sending added organizer email via Resend:",
              err,
            );
          }
        }
      }

      if (removedOrganizerWcaIds.length > 0) {
        const removedUsers = await db.query.user.findMany({
          where: (u, { inArray }) => inArray(u.wcaId, removedOrganizerWcaIds),
          columns: { email: true, name: true },
        });

        for (const r of removedUsers) {
          if (!r.email || !r.name) continue;
          try {
            await sendOrganizerRemovedEmail({
              to: r.email,
              recipientName: r.name,
              city: validatedData.city,
              startDate: startDateStr!,
              endDate: endDateStr!,
            });
          } catch (err) {
            console.error(
              "Error sending removed organizer email via Resend:",
              err,
            );
          }
        }
      }

      if (!("noop" in statusResolution)) {
        const statusLabel =
          existingCompetition?.statusPublic !== resolvedStatuses.statusPublic
            ? formatPublicStatusLabel(resolvedStatuses.statusPublic)
            : formatInternalStatusLabel(resolvedStatuses.statusInternal);
        const statusOrganizerWcaIds = newOrganizerWcaIds.filter(
          (id) => !addedOrganizerWcaIds.includes(id),
        );

        if (statusOrganizerWcaIds.length > 0) {
          const statusUsers = await db.query.user.findMany({
            where: (u, { inArray }) => inArray(u.wcaId, statusOrganizerWcaIds),
            columns: { email: true, name: true },
          });

          for (const u of statusUsers) {
            if (!u.email || !u.name) continue;
            try {
              await sendCompetitionStatusChangedEmail({
                to: u.email,
                recipientName: u.name,
                city: validatedData.city,
                statusLabel,
              });
            } catch (err) {
              console.error(
                "Error sending organizer status email via Resend:",
                err,
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("Error notifying competition team:", err);
    }

    revalidateTag(`competition-${competitionId}`, "days");
    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidateTag("competition-state-counts", "days");
    revalidateTag("competition-delegates-counts", "days");
    revalidatePath("/panel/competencias", "layout");
    revalidatePath("/panel/competencias");
    revalidatePath("/panel");
    revalidatePath("/");

    if (announcedSocial) {
      await refreshTorneoDeRubikCoverBestEffort();
    }

    return {
      success: true,
      message: "Competencia actualizada exitosamente",
    };
  } catch (error) {
    console.error("Error updating competition:", error);
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}
