"use server";

import { z } from "zod";
import { db } from "@workspace/db";
import {
  competitionOrganizers,
  competitions,
  logs,
  user,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireDelegate } from "@/lib/session";

const resend = new Resend(process.env.RESEND_API_KEY!);

const createUltimatumSchema = z.object({
  competitionId: z.number(),
  deadline: z.date(),
  message: z.string().optional().or(z.literal("")),
});

export async function sendUltimatum(
  data: z.infer<typeof createUltimatumSchema>,
) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }
  const { session } = authResult;

  // Validate input
  const validatedData = createUltimatumSchema.parse(data);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(competitions)
        .set({
          ultimatumSetTo: validatedData.deadline,
        })
        .where(eq(competitions.id, validatedData.competitionId));

      await tx.insert(logs).values({
        action: "send_ultimatum",
        targetType: "competition",
        targetId: String(validatedData.competitionId),
        actorId: session.user.id,
        details: validatedData,
      });
    });

    const organizers = await db
      .select({
        email: user.email,
      })
      .from(competitionOrganizers)
      .innerJoin(user, eq(user.wcaId, competitionOrganizers.organizerWcaId))
      .where(
        and(
          eq(competitionOrganizers.competitionId, validatedData.competitionId),
        ),
      );

    for (const organizer of organizers) {
      const email = organizer?.email;
      if (!email || email.includes("@ams.placeholder")) {
        continue;
      }

      await resend.emails.send({
        from: "Asociación Mexicana de Speedcubing <no-reply@amscubing.org>",
        to: email,
        subject: "Ultimátum enviado para tu competencia",
        html: `
          <p>Hola,</p>
          <p>Se ha enviado un ultimátum para una de tus competencias.</p>
          <p>Fecha límite: ${validatedData.deadline.toLocaleDateString()}</p>
          <p>${validatedData.message || "Por favor, asegúrate de cumplir con los requisitos antes de la fecha límite."}</p>
          <p>Saludos,</p>
          <p>Equipo de la Asociación Mexicana de Speedcubing</p>
        `,
      });
    }

    revalidateTag("competitions", "days");
    revalidatePath("/panel");
  } catch {
    return { success: false, message: "Error de base de datos" };
  }

  return { success: true };
}
