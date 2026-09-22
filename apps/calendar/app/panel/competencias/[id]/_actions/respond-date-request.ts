"use server";

import { db } from "@workspace/db";
import {
  acceptPendingDelegateAssignment,
  declinePendingDelegateAssignment,
} from "@workspace/db/competition-transitions";
import {
  competitionNotificationRow,
  insertNotifications,
} from "@workspace/db/notifications";
import {
  competitionDelegates,
  competitionOrganizers,
  competitions,
  user,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import {
  holdAvailability,
  restoreAvailability,
} from "@/lib/availability-dates";
import {
  sendDateRequestAcceptedOrganizerEmail,
  sendDateRequestDeclinedOrganizerEmail,
  sendDateRequestDelegateEmail,
} from "@/lib/calendar-emails";
import { findEligibleDelegate } from "@/lib/find-eligible-delegate";
import { getErrorMessage } from "@/lib/handle-error";
import { notificationAppUrls } from "@/lib/notification-urls";
import { requireDelegate } from "@/lib/session";

async function getPrimaryOrganizer(competitionId: number) {
  const row = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      wcaId: user.wcaId,
      role: user.role,
    })
    .from(competitionOrganizers)
    .innerJoin(user, eq(user.wcaId, competitionOrganizers.organizerWcaId))
    .where(
      and(
        eq(competitionOrganizers.competitionId, competitionId),
        eq(competitionOrganizers.isPrimary, true),
      ),
    )
    .limit(1);

  return row[0] ?? null;
}

/** Accept a pending competition_delegate assignment (post-create reassignment). */
export async function acceptDateRequest(competitionId: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const authResult = await requireDelegate();
    if (!authResult.ok) {
      return { success: false, message: authResult.message };
    }
    const { session } = authResult;
    const wcaId = session.user.wcaId;
    if (!wcaId) {
      return { success: false, message: "Usuario sin WCA ID" };
    }

    const competition = await db.query.competitions.findFirst({
      where: eq(competitions.id, competitionId),
      columns: {
        id: true,
        city: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!competition) {
      return { success: false, message: "Competencia no encontrada" };
    }

    await db.transaction(async (tx) => {
      await acceptPendingDelegateAssignment(tx, {
        competitionId,
        delegateWcaId: wcaId,
      });

      const organizer = await getPrimaryOrganizer(competitionId);
      if (organizer?.id && organizer.wcaId) {
        await insertNotifications(tx, [
          competitionNotificationRow({
            recipient: {
              id: organizer.id,
              role: organizer.role,
              wcaId: organizer.wcaId,
            },
            actorId: session.user.id,
            type: "date_request_accepted",
            urls: notificationAppUrls(),
            competitionId,
            city: competition.city,
          }),
        ]);
      }
    });

    const organizer = await getPrimaryOrganizer(competitionId);
    if (organizer?.email && organizer.name && session.user.email) {
      try {
        await sendDateRequestAcceptedOrganizerEmail({
          to: organizer.email,
          organizerName: organizer.name,
          city: competition.city,
          startDate: competition.startDate,
          endDate: competition.endDate,
          delegateName: session.user.name,
          delegateEmail: session.user.email,
        });
      } catch (err) {
        console.error("Error sending accept email to organizer:", err);
      }
    }

    revalidateTag(`competition-${competitionId}`, "days");
    revalidateTag("competitions", "days");
    revalidateTag("competition-delegates-counts", "days");
    revalidatePath(`/panel/competencias/${competitionId}`);
    revalidatePath("/panel/competencias");
    revalidatePath("/panel");
    revalidatePath("/mis-competencias");

    return {
      success: true,
      message: "Asignación confirmada",
    };
  } catch (error) {
    console.error("Error accepting date request:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}

/** Decline a pending competition_delegate assignment; optionally propose the next eligible. */
export async function declineDateRequest(competitionId: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const authResult = await requireDelegate();
    if (!authResult.ok) {
      return { success: false, message: authResult.message };
    }
    const { session } = authResult;
    const wcaId = session.user.wcaId;
    if (!wcaId) {
      return { success: false, message: "Usuario sin WCA ID" };
    }

    const competition = await db.query.competitions.findFirst({
      where: eq(competitions.id, competitionId),
      columns: {
        id: true,
        city: true,
        stateId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!competition) {
      return { success: false, message: "Competencia no encontrada" };
    }

    const declinedRows = await db.query.competitionDelegates.findMany({
      where: and(
        eq(competitionDelegates.competitionId, competitionId),
        eq(competitionDelegates.status, "declined"),
      ),
      columns: { delegateWcaId: true },
    });

    const excludeWcaIds = [
      wcaId,
      ...declinedRows.map((row) => row.delegateWcaId),
    ];

    const nextDelegate = await db.transaction(async (tx) => {
      const next = await findEligibleDelegate(
        {
          stateId: competition.stateId,
          startDate: competition.startDate,
          endDate: competition.endDate,
          excludeWcaIds,
        },
        tx,
      );

      await declinePendingDelegateAssignment(tx, {
        competitionId,
        delegateWcaId: wcaId,
        nextDelegate: next ? { wcaId: next.wcaId } : null,
      });

      await restoreAvailability(
        tx,
        wcaId,
        competition.startDate,
        competition.endDate,
      );

      if (next) {
        await holdAvailability(
          tx,
          next.wcaId,
          competition.startDate,
          competition.endDate,
        );

        await insertNotifications(tx, [
          competitionNotificationRow({
            recipient: {
              id: next.id,
              role: next.role,
              wcaId: next.wcaId,
            },
            actorId: session.user.id,
            type: "date_requested",
            urls: notificationAppUrls(),
            competitionId,
            city: competition.city,
          }),
        ]);
      }

      return next;
    });

    if (nextDelegate) {
      try {
        await sendDateRequestDelegateEmail({
          to: nextDelegate.email,
          delegateName: nextDelegate.name,
          city: competition.city,
          startDate: competition.startDate,
          endDate: competition.endDate,
          competitionId,
        });
      } catch (err) {
        console.error("Error sending proposal email to next delegate:", err);
      }
    }

    const organizer = await getPrimaryOrganizer(competitionId);
    if (organizer?.email && organizer.name) {
      try {
        await sendDateRequestDeclinedOrganizerEmail({
          to: organizer.email,
          organizerName: organizer.name,
          city: competition.city,
          startDate: competition.startDate,
          endDate: competition.endDate,
          nextDelegateName: nextDelegate?.name ?? null,
        });
      } catch (err) {
        console.error("Error sending decline email to organizer:", err);
      }
    }

    revalidateTag(`competition-${competitionId}`, "days");
    revalidateTag("competitions", "days");
    revalidateTag("competition-delegates-counts", "days");
    revalidatePath(`/panel/competencias/${competitionId}`);
    revalidatePath("/panel/competencias");
    revalidatePath("/panel");
    revalidatePath("/mis-competencias");
    revalidatePath("/solicitar-fecha");

    return {
      success: true,
      message: nextDelegate
        ? `Propuesta rechazada. Se ofreció a ${nextDelegate.name}.`
        : "Propuesta rechazada. No hay otro delegado disponible por ahora.",
    };
  } catch (error) {
    console.error("Error declining date request:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}
