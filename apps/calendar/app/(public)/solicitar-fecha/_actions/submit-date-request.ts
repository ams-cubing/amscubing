"use server";

import { db } from "@workspace/db";
import {
  dateRequestNotificationRow,
  insertNotifications,
} from "@workspace/db/notifications";
import { dateRequests } from "@workspace/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";

import { holdAvailability, toDateOnlyString } from "@/lib/availability-dates";
import { auth } from "@/lib/auth";
import {
  sendDateRequestDelegateEmail,
  sendDateRequestOrganizerEmail,
} from "@/lib/calendar-emails";
import { findEligibleDelegate } from "@/lib/find-eligible-delegate";
import { getErrorMessage } from "@/lib/handle-error";
import { notificationAppUrls } from "@/lib/notification-urls";
import { MAX_DATE_REQUESTS_PER_WEEK } from "../_lib/constants";

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
    const startDateStr = toDateOnlyString(validatedData.startDate);
    const endDateStr = toDateOnlyString(validatedData.endDate);
    const requesterWcaId = session.user.wcaId;

    const recentRequests = await db.query.dateRequests.findMany({
      where: and(
        eq(dateRequests.requestedBy, requesterWcaId),
        gte(
          dateRequests.createdAt,
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        ),
      ),
      columns: { id: true },
    });

    if (recentRequests.length >= MAX_DATE_REQUESTS_PER_WEEK) {
      return {
        success: false,
        message:
          "Has alcanzado el límite de 3 solicitudes por semana. Intenta de nuevo más tarde.",
      };
    }

    let proposedDelegate;
    let newRequest;

    try {
      const result = await db.transaction(async (tx) => {
        const proposed = await findEligibleDelegate(
          {
            stateId: validatedData.stateId,
            startDate: startDateStr,
            endDate: endDateStr,
          },
          tx,
        );

        if (!proposed) {
          return { proposed: null, request: null };
        }

        const [request] = await tx
          .insert(dateRequests)
          .values({
            city: validatedData.city,
            stateId: validatedData.stateId,
            requestedBy: requesterWcaId,
            startDate: startDateStr,
            endDate: endDateStr,
            proposedDelegateWcaId: proposed.wcaId,
            declinedDelegateWcaIds: [],
            status: "open",
          })
          .returning();

        await holdAvailability(tx, proposed.wcaId, startDateStr, endDateStr);

        await insertNotifications(tx, [
          dateRequestNotificationRow({
            recipient: {
              id: proposed.id,
              role: proposed.role,
              wcaId: proposed.wcaId,
            },
            actorId: session.user.id,
            type: "date_requested",
            urls: notificationAppUrls(),
            dateRequestId: request!.id,
            city: validatedData.city,
          }),
        ]);

        return { proposed, request };
      });

      proposedDelegate = result.proposed;
      newRequest = result.request;
    } catch (err) {
      console.error("Transaction failed:", err);
      throw err;
    }

    if (!proposedDelegate || !newRequest) {
      return {
        success: false,
        message:
          "No hay un delegado disponible para esas fechas. Elige otro rango o intenta más tarde.",
      };
    }

    try {
      await sendDateRequestDelegateEmail({
        to: proposedDelegate.email,
        delegateName: proposedDelegate.name,
        city: newRequest.city ?? validatedData.city,
        startDate: startDateStr,
        endDate: endDateStr,
        dateRequestId: newRequest.id,
      });
    } catch (err) {
      console.error("Error sending delegate email via Resend:", err);
    }

    try {
      if (session.user.email && session.user.name) {
        await sendDateRequestOrganizerEmail({
          to: session.user.email,
          organizerName: session.user.name,
          city: newRequest.city ?? validatedData.city,
          startDate: startDateStr,
          endDate: endDateStr,
          delegateName: proposedDelegate.name,
          delegateEmail: proposedDelegate.email,
          pendingConfirmation: true,
        });
      }
    } catch (err) {
      console.error("Error sending organizer email via Resend:", err);
    }

    return {
      success: true,
      message: `Solicitud creada. Se propuso a ${proposedDelegate.name}; queda pendiente de su confirmación.`,
    };
  } catch (error) {
    console.error("Error submitting date request:", error);
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}
