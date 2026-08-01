"use server";

import { db } from "@workspace/db";
import {
  competitions,
  competitionDelegates,
  competitionOrganizers,
  logs,
  availability,
} from "@workspace/db/schema";
import { auth } from "@/lib/auth";
import { and, gte, inArray, lte } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { Resend } from "resend";
import { z } from "zod";
import { createCompetitionSchema } from "../../_lib/validations";

const resend = new Resend(process.env.RESEND_API_KEY!);

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

    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidateTag("competition-state-counts", "days");
    revalidateTag("competition-delegates-counts", "days");
    revalidatePath("/panel");
    revalidatePath("/");

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
