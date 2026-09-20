"use server";

import { db } from "@workspace/db";
import {
  competitionNotificationRow,
  insertNotifications,
} from "@workspace/db/notifications";
import {
  availability,
  competitionDelegates,
  competitionOrganizers,
  competitions,
  user,
} from "@workspace/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import {
  sendDateRequestAcceptedOrganizerEmail,
  sendDateRequestDeclinedOrganizerEmail,
  sendDateRequestDelegateEmail,
} from "@/lib/calendar-emails";
import { findEligibleDelegate } from "@/lib/find-eligible-delegate";
import { getErrorMessage } from "@/lib/handle-error";
import { notificationAppUrls } from "@/lib/notification-urls";
import { requireDelegate } from "@/lib/session";

function dateRangeStrings(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function restoreAvailability(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  wcaId: string,
  startDate: string,
  endDate: string,
) {
  const dates = dateRangeStrings(startDate, endDate);
  if (dates.length === 0) return;

  await tx
    .insert(availability)
    .values(dates.map((date) => ({ userWcaId: wcaId, date })))
    .onConflictDoNothing();
}

async function getPrimaryOrganizer(competitionId: number) {
  const row = await db
    .select({
      name: user.name,
      email: user.email,
      wcaId: user.wcaId,
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

    const pending = await db.query.competitionDelegates.findFirst({
      where: and(
        eq(competitionDelegates.competitionId, competitionId),
        eq(competitionDelegates.delegateWcaId, wcaId),
        eq(competitionDelegates.status, "pending"),
      ),
    });

    if (!pending) {
      return {
        success: false,
        message: "No tienes una propuesta pendiente para esta competencia",
      };
    }

    await db
      .update(competitionDelegates)
      .set({ status: "accepted" })
      .where(
        and(
          eq(competitionDelegates.competitionId, competitionId),
          eq(competitionDelegates.delegateWcaId, wcaId),
          eq(competitionDelegates.status, "pending"),
        ),
      );

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

    const pending = await db.query.competitionDelegates.findFirst({
      where: and(
        eq(competitionDelegates.competitionId, competitionId),
        eq(competitionDelegates.delegateWcaId, wcaId),
        eq(competitionDelegates.status, "pending"),
      ),
    });

    if (!pending) {
      return {
        success: false,
        message: "No tienes una propuesta pendiente para esta competencia",
      };
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

    const nextDelegate = await findEligibleDelegate({
      stateId: competition.stateId,
      startDate: competition.startDate,
      endDate: competition.endDate,
      excludeWcaIds,
    });

    await db.transaction(async (tx) => {
      await tx
        .update(competitionDelegates)
        .set({ status: "declined", isPrimary: false })
        .where(
          and(
            eq(competitionDelegates.competitionId, competitionId),
            eq(competitionDelegates.delegateWcaId, wcaId),
            eq(competitionDelegates.status, "pending"),
          ),
        );

      await restoreAvailability(
        tx,
        wcaId,
        competition.startDate,
        competition.endDate,
      );

      if (nextDelegate) {
        await tx.insert(competitionDelegates).values({
          competitionId,
          delegateWcaId: nextDelegate.wcaId,
          isPrimary: true,
          status: "pending",
        });

        await tx
          .delete(availability)
          .where(
            and(
              eq(availability.userWcaId, nextDelegate.wcaId),
              gte(availability.date, competition.startDate),
              lte(availability.date, competition.endDate),
            ),
          );

        await insertNotifications(tx, [
          competitionNotificationRow({
            recipient: {
              id: nextDelegate.id,
              role: nextDelegate.role,
              wcaId: nextDelegate.wcaId,
            },
            actorId: session.user.id,
            type: "date_requested",
            urls: notificationAppUrls(),
            competitionId,
            city: competition.city,
          }),
        ]);
      }
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
