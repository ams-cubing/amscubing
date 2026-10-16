"use server";

import { db } from "@workspace/db";
import { createCompetitionFromDateRequestAccept } from "@workspace/db/competition-transitions";
import {
  dateRequestNotificationRow,
  insertNotifications,
} from "@workspace/db/notifications";
import { dateRequests } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import {
  holdAvailability,
  restoreAvailability,
} from "@/lib/availability-dates";
import {
  sendDateRequestAcceptedOrganizerEmail,
  sendDateRequestDeclinedOrganizerEmail,
  sendDateRequestDelegateEmail,
} from "@/lib/calendar-emails";
import { parseDeclineReason } from "@/lib/decline-reason";
import { getEligibleReassignmentDelegate } from "@/lib/find-eligible-delegate";
import { getErrorMessage } from "@/lib/handle-error";
import { notificationAppUrls } from "@/lib/notification-urls";
import { requireDelegate } from "@/lib/session";
import { log } from "@workspace/server/log";

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

    if (request.competitionId != null) {
      return {
        success: false,
        message: "Esta solicitud ya tiene una competencia asociada",
      };
    }

    if (request.proposedDelegateWcaId !== wcaId) {
      return {
        success: false,
        message: "No tienes una propuesta pendiente para esta solicitud",
      };
    }

    const competitionId = await db.transaction(async (tx) => {
      const fresh = await tx.query.dateRequests.findFirst({
        where: eq(dateRequests.id, dateRequestId),
        columns: {
          status: true,
          proposedDelegateWcaId: true,
          competitionId: true,
        },
      });

      if (
        !fresh ||
        fresh.status !== "open" ||
        fresh.competitionId != null ||
        fresh.proposedDelegateWcaId !== wcaId
      ) {
        throw new Error("La solicitud ya no está disponible para confirmar");
      }

      const newCompetitionId = await createCompetitionFromDateRequestAccept(
        tx,
        {
          dateRequestId,
          actorId: session.user.id,
          city: request.city,
          stateId: request.stateId,
          requestedByUserId: request.requestedByUserId,
          startDate: request.startDate,
          endDate: request.endDate,
          delegateWcaId: wcaId,
        },
      );

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
        log.error("calendar.accept_email_failed", { error: err });
      }
    }

    updateTag(`competition-${competitionId}`);
    updateTag("competitions");
    updateTag("competition-delegates-counts");
    revalidatePath(`/panel/solicitudes-fecha/${dateRequestId}`);
    revalidatePath("/panel/solicitudes-fecha");
    revalidatePath(`/panel/competencias/${competitionId}`);
    revalidatePath("/panel/competencias");
    revalidatePath("/panel");
    revalidatePath("/mis-competencias");

    return {
      success: true,
      message: "Asignación confirmada. Se creó la competencia.",
      competitionId,
    };
  } catch (error) {
    log.error("calendar.date_request_accept_failed", { error });
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function declineDateRequest(
  dateRequestId: number,
  input: {
    reason: string;
    replacementWcaId?: string | null;
  },
): Promise<{
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

    const reasonResult = parseDeclineReason(input.reason);
    if (!reasonResult.ok) {
      return { success: false, message: reasonResult.message };
    }
    const reason = reasonResult.reason;
    const replacementWcaId = input.replacementWcaId?.trim() || null;

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

    if (replacementWcaId && declined.includes(replacementWcaId)) {
      return {
        success: false,
        message: "Ese delegado ya rechazó esta solicitud",
      };
    }

    const nextDelegate = await db.transaction(async (tx) => {
      await restoreAvailability(tx, wcaId, request.startDate, request.endDate);

      const next = replacementWcaId
        ? await getEligibleReassignmentDelegate(
            {
              stateId: request.stateId,
              startDate: request.startDate,
              endDate: request.endDate,
              replacementWcaId,
              excludeWcaIds: declined,
            },
            tx,
          )
        : null;

      if (replacementWcaId && !next) {
        throw new Error(
          "El delegado seleccionado no está disponible para esas fechas",
        );
      }

      if (next) {
        await tx
          .update(dateRequests)
          .set({
            proposedDelegateWcaId: next.wcaId,
            declinedDelegateWcaIds: declined,
            lastDeclineReason: reason,
            updatedAt: new Date(),
          })
          .where(eq(dateRequests.id, dateRequestId));

        await holdAvailability(
          tx,
          next.wcaId,
          request.startDate,
          request.endDate,
        );

        await insertNotifications(tx, [
          dateRequestNotificationRow({
            recipient: {
              id: next.id,
              role: next.role,
              wcaId: next.wcaId,
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
                  statusLabel: `Se propuso a ${next.name}`,
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
            lastDeclineReason: reason,
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

      return next;
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
        log.error("calendar.proposal_email_failed", { error: err });
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
          reason,
        });
      } catch (err) {
        log.error("calendar.decline_email_failed", { error: err });
      }
    }

    revalidatePath(`/panel/solicitudes-fecha/${dateRequestId}`);
    revalidatePath("/panel/solicitudes-fecha");
    revalidatePath("/panel");
    revalidatePath("/mis-competencias");
    revalidatePath("/solicitar-fecha");

    return {
      success: true,
      message: nextDelegate
        ? `Propuesta rechazada. Se ofreció a ${nextDelegate.name}.`
        : "Propuesta rechazada. La solicitud quedó sin delegado disponible.",
    };
  } catch (error) {
    log.error("calendar.date_request_decline_failed", { error });
    return { success: false, message: getErrorMessage(error) };
  }
}
