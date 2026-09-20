"use server";

import { db } from "@workspace/db";
import {
  dateRequestNotificationRow,
  insertNotifications,
} from "@workspace/db/notifications";
import { availability, dateRequests } from "@workspace/db/schema";
import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  sendDateRequestDelegateEmail,
  sendDateRequestOrganizerEmail,
} from "@/lib/calendar-emails";
import { findEligibleDelegate } from "@/lib/find-eligible-delegate";
import { getErrorMessage } from "@/lib/handle-error";
import { notificationAppUrls } from "@/lib/notification-urls";
import { headers } from "next/headers";

const dateRequestSchema = z
  .object({
    city: z.string().min(2),
    stateId: z.string().min(1),
    startDate: z.date({
      error: (issue) =>
        issue.input === undefined
          ? "Fecha de inicio requerida"
          : "Fecha inválida",
    }),
    endDate: z.date({
      error: (issue) =>
        issue.input === undefined ? "Fecha de fin requerida" : "Fecha inválida",
    }),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
  });

export async function submitDateRequest(
  data: z.infer<typeof dateRequestSchema>,
) {
  try {
    const headersList = await headers();

    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session || !session.user) {
      return {
        success: false,
        message: "No autenticado",
      };
    }

    if (!session.user.wcaId) {
      return {
        success: false,
        message: "Usuario sin WCA ID",
      };
    }

    const validatedData = dateRequestSchema.parse(data);

    const startDateStr = validatedData.startDate.toISOString().split("T")[0]!;
    const endDateStr = validatedData.endDate.toISOString().split("T")[0]!;

    const proposedDelegate = await findEligibleDelegate({
      stateId: validatedData.stateId,
      startDate: startDateStr,
      endDate: endDateStr,
    });

    let newRequest;
    try {
      const result = await db.transaction(async (tx) => {
        const [request] = await tx
          .insert(dateRequests)
          .values({
            city: validatedData.city,
            stateId: validatedData.stateId,
            requestedBy: session.user.wcaId!,
            startDate: startDateStr,
            endDate: endDateStr,
            proposedDelegateWcaId: proposedDelegate?.wcaId ?? null,
            declinedDelegateWcaIds: [],
            status: proposedDelegate ? "open" : "exhausted",
          })
          .returning();

        if (proposedDelegate) {
          await tx
            .delete(availability)
            .where(
              and(
                eq(availability.userWcaId, proposedDelegate.wcaId),
                gte(availability.date, startDateStr),
                lte(availability.date, endDateStr),
              ),
            );

          await insertNotifications(tx, [
            dateRequestNotificationRow({
              recipient: {
                id: proposedDelegate.id,
                role: proposedDelegate.role,
                wcaId: proposedDelegate.wcaId,
              },
              actorId: session.user.id,
              type: "date_requested",
              urls: notificationAppUrls(),
              dateRequestId: request!.id,
              city: validatedData.city,
            }),
          ]);
        }

        return { request };
      });

      newRequest = result.request;
    } catch (err) {
      console.error("Transaction failed:", err);
      throw err;
    }

    try {
      if (proposedDelegate && newRequest?.id) {
        await sendDateRequestDelegateEmail({
          to: proposedDelegate.email,
          delegateName: proposedDelegate.name,
          city: newRequest.city ?? validatedData.city,
          startDate: startDateStr,
          endDate: endDateStr,
          dateRequestId: newRequest.id,
        });
      }
    } catch (err) {
      console.error("Error sending delegate email via Resend:", err);
    }

    try {
      if (session.user.email && session.user.name) {
        await sendDateRequestOrganizerEmail({
          to: session.user.email,
          organizerName: session.user.name,
          city: newRequest?.city ?? validatedData.city,
          startDate: startDateStr,
          endDate: endDateStr,
          delegateName: proposedDelegate?.name ?? null,
          delegateEmail: proposedDelegate?.email ?? null,
          pendingConfirmation: Boolean(proposedDelegate),
        });
      }
    } catch (err) {
      console.error("Error sending organizer email via Resend:", err);
    }

    return {
      success: true,
      message: proposedDelegate
        ? `Solicitud creada. Se propuso a ${proposedDelegate.name}; queda pendiente de su confirmación.`
        : "Solicitud creada. Aún no hay un delegado disponible para proponer.",
    };
  } catch (error) {
    console.error("Error submitting date request:", error);
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}
