"use server";

import { db } from "@workspace/db";
import {
  competitions,
  user,
  states,
  competitionDelegates,
  competitionOrganizers,
  availability,
  logs,
} from "@workspace/db/schema";
import { z } from "zod";
import { eq, and, lte, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

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

    // Validate input
    const validatedData = dateRequestSchema.parse(data);

    // 1. Get the state and its region
    const state = await db.query.states.findFirst({
      where: eq(states.id, validatedData.stateId),
      with: {
        region: true,
      },
    });

    if (!state) {
      return {
        success: false,
        message: "Estado no encontrado",
      };
    }

    // 2. Find a delegate availble for that region
    const startDateStr = validatedData.startDate.toISOString().split("T")[0];
    const endDateStr = validatedData.endDate.toISOString().split("T")[0];
    const start = new Date(startDateStr!);
    const end = new Date(endDateStr!);
    const oneDayMs = 24 * 60 * 60 * 1000;
    const daysCount =
      Math.floor((end.getTime() - start.getTime()) / oneDayMs) + 1;

    let candidates = await db.query.user.findMany({
      where: and(eq(user.regionId, state.regionId), eq(user.role, "delegate")),
      columns: { wcaId: true, name: true, email: true },
    });

    if (candidates.length === 0) {
      candidates = await db.query.user.findMany({
        where: eq(user.role, "delegate"),
        columns: { wcaId: true, name: true, email: true },
      });
    }

    let delegateInRegion = null;
    for (const c of candidates) {
      // availability rows for the full range
      const availRows = await db.query.availability.findMany({
        where: (a, { and, eq, gte, lte }) =>
          and(
            eq(a.userWcaId, c.wcaId),
            gte(a.date, startDateStr!),
            lte(a.date, endDateStr!),
          ),
        columns: { date: true },
      });

      if (availRows.length !== daysCount) continue;

      // ensure no overlapping competitions assigned in the same range
      const overlapping = await db
        .select()
        .from(competitionDelegates)
        .innerJoin(
          competitions,
          eq(competitionDelegates.competitionId, competitions.id),
        )
        .where(
          and(
            eq(competitionDelegates.delegateWcaId, c.wcaId),
            lte(competitions.startDate, endDateStr!),
            gte(competitions.endDate, startDateStr!),
          ),
        )
        .limit(1);

      if (overlapping.length > 0) continue;

      delegateInRegion = c;
      break;
    }

    let newCompetition;
    try {
      const result = await db.transaction(async (tx) => {
        const [comp] = await tx
          .insert(competitions)
          .values({
            city: validatedData.city,
            stateId: validatedData.stateId,
            requestedBy: session?.user?.wcaId,
            startDate: startDateStr!,
            endDate: endDateStr!,
            statusPublic: "reserved",
            statusInternal: "looking_for_venue",
          })
          .returning();

        if (!delegateInRegion) {
          return { comp };
        }

        await tx.insert(competitionDelegates).values({
          competitionId: comp?.id,
          delegateWcaId: delegateInRegion.wcaId,
          isPrimary: true,
        });

        await tx
          .delete(availability)
          .where(
            and(
              eq(availability.userWcaId, delegateInRegion.wcaId),
              gte(availability.date, startDateStr!),
              lte(availability.date, endDateStr!),
            ),
          );

        if (session?.user?.wcaId) {
          await tx.insert(competitionOrganizers).values({
            competitionId: comp?.id,
            organizerWcaId: session.user.wcaId,
            isPrimary: true,
          });
        }

        await tx.insert(logs).values({
          action: "create_competition",
          targetType: "competition",
          targetId: String(comp?.id),
          actorId: session?.user.id,
          details: validatedData,
        });

        return { comp };
      });

      newCompetition = result.comp;
    } catch (err) {
      console.error("Transaction failed:", err);
      throw err;
    }

    try {
      if (delegateInRegion) {
        await resend.emails.send({
          from: "Asociación Mexicana de Speedcubing <no-reply@amscubing.org>",
          to: delegateInRegion?.email,
          subject: `Nueva asignación: ${newCompetition?.city} (${startDateStr} - ${endDateStr})`,
          html: `
          <p>Hola ${delegateInRegion?.name},</p>
          <p>Se te ha asignado como delegado para la competencia en ${newCompetition?.city} (${startDateStr} - ${endDateStr}).</p>
          <p><a href="${process.env.BETTER_AUTH_URL}/panel">Mira los detalles en el panel de competencias</a></p>
        `,
        });
      }
    } catch (err) {
      console.error("Error sending delegate email via Resend:", err);
    }

    try {
      await resend.emails.send({
        from: "Asociación Mexicana de Speedcubing <no-reply@amscubing.org>",
        to: session?.user?.email,
        subject: `Fecha solicitada en ${newCompetition?.city} (${startDateStr} - ${endDateStr})`,
        html: `
          <p>Hola ${session?.user?.name},</p>
          <p>Tu solicitud de fecha para una competencia en ${newCompetition?.city} (${startDateStr} - ${endDateStr}) ha sido creada exitosamente.</p>
          <p>El delegado asignado es: ${delegateInRegion ? delegateInRegion?.name : "Aún no se ha asignado un delegado"}</p>
          <p>Puedes contactarlo en: ${delegateInRegion ? delegateInRegion?.email : "Pendiente"}</p>
          <p><a href="${process.env.BETTER_AUTH_URL}/mis-competencias">Revisa los detalles aquí</a></p>
        `,
      });
    } catch (err) {
      console.error("Error sending organizer email via Resend:", err);
    }

    return {
      success: true,
      message: `Solicitud creada exitosamente. Delegado asignado: ${delegateInRegion ? delegateInRegion.name : "Aún no se ha asignado un delegado"}`,
    };
  } catch (error) {
    console.error("Error submitting date request:", error);
    return {
      success: false,
      message: "Error al procesar la solicitud",
    };
  }
}
