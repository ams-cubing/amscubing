"use server";

import { db } from "@/db";
import { availability, logs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

export async function submitAvailability(data: { dates: Date[] }) {
  try {
    const headersList = await headers();

    const session = await auth.api.getSession({
      headers: headersList,
    });

    const userWcaId = session?.user?.wcaId;

    if (!userWcaId) {
      return {
        success: false,
        message: "Debes iniciar sesión para registrar disponibilidad",
      };
    }

    const values = data.dates.map((date) => ({
      date: date.toISOString().split("T")[0]!,
    }));

    const existingRows = await db
      .select({ date: availability.date })
      .from(availability)
      .where(eq(availability.userWcaId, userWcaId));

    const toInsert = values
      .map((v) => v.date)
      .filter(
        (date) => !existingRows.find((existing) => existing.date === date),
      );

    const toDelete = existingRows
      .map((v) => v.date)
      .filter((date) => !values.find((newVal) => newVal.date === date));

    await db.transaction(async (tx) => {
      if (toDelete.length) {
        for (const delDate of toDelete) {
          await tx
            .delete(availability)
            .where(
              and(
                eq(availability.userWcaId, userWcaId),
                eq(availability.date, delDate),
              ),
            );
        }
      }

      if (toInsert.length) {
        await tx.insert(availability).values(
          toInsert.map((d) => ({
            userWcaId,
            date: d,
          })),
        );
      }

      if (session?.user?.id) {
        await tx.insert(logs).values({
          action: "submit_availability",
          targetType: "availability",
          targetId: userWcaId,
          actorId: session.user.id,
          details: {
            inserted: toInsert,
            deleted: toDelete,
          },
        });
      }
    });

    revalidatePath("/panel/disponibilidad");
    revalidatePath("/solicitar-fecha");

    return {
      success: true,
      message: "Disponibilidad actualizada exitosamente",
    };
  } catch (error) {
    console.error("Error submitting availability:", error);
    return {
      success: false,
      message: "Error al actualizar la disponibilidad",
    };
  }
}
// ...existing code...
