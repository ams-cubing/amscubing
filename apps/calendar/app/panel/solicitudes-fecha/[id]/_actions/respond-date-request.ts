"use server";

import { db } from "@workspace/db";
import {
  dateRequestNotificationRow,
  insertNotifications,
} from "@workspace/db/notifications";
import {
  availability,
  competitionDelegates,
  competitionOrganizers,
  competitions,
  dateRequests,
  logs,
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

export async function acceptDateRequest(dateRequestId: number): Promise<{
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
    const wcaId = session.user.wcaId;
    if (!wcaId) {
      return { success: false, message: "Usuario sin WCA ID" };
    }

    const request = await db.query.dateRequests.findFirst({
      where: eq(dateRequests.id, dateRequestId),
      with: {
        requester: {
          columns: {
            id: true,
            name: true,
            email: true,
            wcaId: true,
            role: true,
          },
        },
      },
    });

    if (!request || request.status !== "open") {
      return {
        success: false,
        message: "Solicitud no encontrada o ya cerrada",
      };
    }

    if (request.proposedDelegateWcaId !== wcaId) {
      return {
        success: false,
        message: "No tienes una propuesta pendiente para esta solicitud",
      };
    }

    const competitionId = await db.transaction(async (tx) => {
      const [comp] = await tx
        .insert(competitions)
        .values({
          city: request.city,
          stateId: request.stateId,
          requestedBy: request.requestedBy,
          startDate: request.startDate,
          endDate: request.endDate,
          statusPublic: "reserved",
          statusInternal: "looking_for_venue",
        })
        .returning({ id: competitions.id });

      const newCompetitionId = comp!.id;

      await tx.insert(competitionDelegates).values({
        competitionId: newCompetitionId,
        delegateWcaId: wcaId,
        isPrimary: true,
        status: "accepted",
      });

      await tx.insert(competitionOrganizers).values({
        competitionId: newCompetitionId,
        organizerWcaId: request.requestedBy,
        isPrimary: true,
      });

      await tx.insert(logs).values({
        action: "create_competition",
        targetType: "competition",
        targetId: String(newCompetitionId),
        actorId: session.user.id,
        details: {
          fromDateRequestId: dateRequestId,
          city: request.city,
          stateId: request.stateId,
          startDate: request.startDate,
          endDate: request.endDate,
        },
      });

      await tx
        .update(dateRequests)
        .set({
          status: "accepted",
          competitionId: newCompetitionId,
          updatedAt: new Date(),
        })
        .where(eq(dateRequests.id, dateRequestId));

      if (request.requester) {
        await insertNotifications(tx, [
          dateRequestNotificationRow({
            recipient: {
              id: request.requester.id,
              role: request.requester.role,
              wcaId: request.requester.wcaId,
            },
            actorId: session.user.id,
            type: "date_request_accepted",
            urls: notificationAppUrls(),
            dateRequestId,
            competitionId: newCompetitionId,
            city: request.city,
          }),
        ]);
      }

      return newCompetitionId;
    });

    if (
      request.requester?.email &&
      request.requester.name &&
      session.user.email
    ) {
      try {
        await sendDateRequestAcceptedOrganizerEmail({
          to: request.requester.email,
          organizerName: request.requester.name,
          city: request.city,
          startDate: request.startDate,
          endDate: request.endDate,
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
    revalidatePath(`/panel/solicitudes-fecha/${dateRequestId}`);
    revalidatePath("/panel/solicitudes-fecha");
    revalidatePath(`/panel/competencias/${competitionId}`);
    revalidatePath("/mis-competencias");

    return {
      success: true,
      message: "Asignación confirmada. Se creó la competencia.",
      competitionId,
    };
  } catch (error) {
    console.error("Error accepting date request:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function declineDateRequest(dateRequestId: number): Promise<{
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

    const request = await db.query.dateRequests.findFirst({
      where: eq(dateRequests.id, dateRequestId),
      with: {
        requester: {
          columns: {
            id: true,
            name: true,
            email: true,
            wcaId: true,
            role: true,
          },
        },
      },
    });

    if (!request || request.status !== "open") {
      return {
        success: false,
        message: "Solicitud no encontrada o ya cerrada",
      };
    }

    if (request.proposedDelegateWcaId !== wcaId) {
      return {
        success: false,
        message: "No tienes una propuesta pendiente para esta solicitud",
      };
    }

    const declined = [
      ...new Set([...(request.declinedDelegateWcaIds ?? []), wcaId]),
    ];

    const nextDelegate = await findEligibleDelegate({
      stateId: request.stateId,
      startDate: request.startDate,
      endDate: request.endDate,
      excludeWcaIds: declined,
    });

    await db.transaction(async (tx) => {
      await restoreAvailability(tx, wcaId, request.startDate, request.endDate);

      if (nextDelegate) {
        await tx
          .update(dateRequests)
          .set({
            proposedDelegateWcaId: nextDelegate.wcaId,
            declinedDelegateWcaIds: declined,
            updatedAt: new Date(),
          })
          .where(eq(dateRequests.id, dateRequestId));

        await tx
          .delete(availability)
          .where(
            and(
              eq(availability.userWcaId, nextDelegate.wcaId),
              gte(availability.date, request.startDate),
              lte(availability.date, request.endDate),
            ),
          );

        await insertNotifications(tx, [
          dateRequestNotificationRow({
            recipient: {
              id: nextDelegate.id,
              role: nextDelegate.role,
              wcaId: nextDelegate.wcaId,
            },
            actorId: session.user.id,
            type: "date_requested",
            urls: notificationAppUrls(),
            dateRequestId,
            city: request.city,
          }),
          ...(request.requester
            ? [
                dateRequestNotificationRow({
                  recipient: {
                    id: request.requester.id,
                    role: request.requester.role,
                    wcaId: request.requester.wcaId,
                  },
                  actorId: session.user.id,
                  type: "date_request_declined",
                  urls: notificationAppUrls(),
                  dateRequestId,
                  city: request.city,
                  statusLabel: `Se propuso a ${nextDelegate.name}`,
                }),
              ]
            : []),
        ]);
      } else {
        await tx
          .update(dateRequests)
          .set({
            proposedDelegateWcaId: null,
            declinedDelegateWcaIds: declined,
            status: "exhausted",
            updatedAt: new Date(),
          })
          .where(eq(dateRequests.id, dateRequestId));

        if (request.requester) {
          await insertNotifications(tx, [
            dateRequestNotificationRow({
              recipient: {
                id: request.requester.id,
                role: request.requester.role,
                wcaId: request.requester.wcaId,
              },
              actorId: session.user.id,
              type: "date_request_declined",
              urls: notificationAppUrls(),
              dateRequestId,
              city: request.city,
              statusLabel: "Sin delegado disponible",
            }),
          ]);
        }
      }
    });

    if (nextDelegate) {
      try {
        await sendDateRequestDelegateEmail({
          to: nextDelegate.email,
          delegateName: nextDelegate.name,
          city: request.city,
          startDate: request.startDate,
          endDate: request.endDate,
          dateRequestId,
        });
      } catch (err) {
        console.error("Error sending proposal email to next delegate:", err);
      }
    }

    if (request.requester?.email && request.requester.name) {
      try {
        await sendDateRequestDeclinedOrganizerEmail({
          to: request.requester.email,
          organizerName: request.requester.name,
          city: request.city,
          startDate: request.startDate,
          endDate: request.endDate,
          nextDelegateName: nextDelegate?.name ?? null,
        });
      } catch (err) {
        console.error("Error sending decline email to organizer:", err);
      }
    }

    revalidatePath(`/panel/solicitudes-fecha/${dateRequestId}`);
    revalidatePath("/panel/solicitudes-fecha");
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
