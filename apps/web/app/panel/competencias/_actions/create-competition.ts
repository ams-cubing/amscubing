"use server";

import { db } from "@/db";
import {
  competitions,
  competitionDelegates,
  competitionOrganizers,
  logs,
  availability,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, gte, inArray, lte } from "drizzle-orm";
import { headers } from "next/headers";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY!);

const createCompetitionSchema = z
  .object({
    name: z.string().min(2).optional().or(z.literal("")),
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
    trelloUrl: z.url().optional().or(z.literal("")),
    wcaCompetitionUrl: z.url("URL inválida").optional().or(z.literal("")),
    capacity: z.number().min(2, "La capacidad debe ser al menos 2").optional(),
    statusPublic: z.enum([
      "open",
      "reserved",
      "confirmed",
      "announced",
      "suspended",
      "unavailable",
    ]),
    statusInternal: z.enum([
      "asked_for_help",
      "looking_for_venue",
      "venue_found",
      "wca_approved",
      "registration_open",
      "celebrated",
      "cancelled",
    ]),
    // delegates are optional; if any are provided, a primary must be selected
    delegateWcaIds: z.array(z.string()).optional().default([]),
    primaryDelegateWcaId: z.string().optional().or(z.literal("")),
    organizerWcaIds: z
      .array(z.string())
      .min(1, "Selecciona al menos un organizador"),
    primaryOrganizerWcaId: z
      .string()
      .min(1, "Selecciona un organizador principal"),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  // If there are delegates selected, primaryDelegateWcaId must be set and included in the list
  .refine(
    (data) => {
      const delegates = data.delegateWcaIds || [];
      if (delegates.length === 0) return true;
      return (
        !!data.primaryDelegateWcaId &&
        delegates.includes(data.primaryDelegateWcaId)
      );
    },
    {
      message: "Selecciona un delegado principal",
      path: ["primaryDelegateWcaId"],
    },
  )
  .refine((data) => data.organizerWcaIds.includes(data.primaryOrganizerWcaId), {
    message: "El organizador principal debe estar en la lista de organizadores",
    path: ["primaryOrganizerWcaId"],
  });

export async function createCompetition(
  data: z.infer<typeof createCompetitionSchema>,
): Promise<{
  success: boolean;
  message: string;
  competitionId?: number;
}> {
  try {
    const headersList = await headers();

    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user?.wcaId) {
      return {
        success: false,
        message: "No autenticado",
      };
    }

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

      if (session?.user?.id) {
        await tx.insert(logs).values({
          action: "create_competition",
          targetType: "competition",
          targetId: String(newCompetitionId),
          actorId: session.user.id,
          details: validatedData,
        });
      }
    });

    try {
      const delegates = await db.query.user.findMany({
        where: (u, { inArray }) =>
          inArray(u.wcaId, validatedData.delegateWcaIds),
        columns: { email: true, name: true },
      });

      for (const d of delegates) {
        if (!d.email) continue;
        try {
          await resend.emails.send({
            from: "Asociación Mexicana de Speedcubing <no-reply@amscubing.org>",
            to: d.email,
            subject: `Asignación como delegado: ${validatedData.city} (${startDateStr} - ${endDateStr})`,
            html: `
            <p>Hola ${d.name},</p>
            <p>Has sido asignado como delegado para una competencia en ${validatedData.city} (${startDateStr} - ${endDateStr}).</p>
            <p><a href="${process.env.BETTER_AUTH_URL}/panel">Revisa el panel de competencias para más detalles</a></p>
            `,
          });
        } catch (err) {
          console.error("Error sending delegate email via Resend:", err);
        }
      }
    } catch (err) {
      console.error("Error fetching delegate emails:", err);
    }

    return {
      success: true,
      message: "Competencia creada exitosamente",
      competitionId: newCompetitionId,
    };
  } catch (error) {
    console.error("Error creating competition:", error);
    return {
      success: false,
      message: "Error al crear la competencia",
    };
  }
}
