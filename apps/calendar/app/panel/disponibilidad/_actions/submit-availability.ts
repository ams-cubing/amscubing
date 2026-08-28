"use server";

import { db } from "@workspace/db";
import { availability, logs } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireDelegate } from "@/lib/session";
import { getErrorMessage } from "@/lib/handle-error";

export async function submitAvailability(data: { dates: Date[] }) {
  try {
    const authResult = await requireDelegate();
    if (!authResult.ok) {
      return { success: false, message: authResult.message };
    }
    const { session } = authResult;
    const userWcaId = session.user.wcaId;

    if (!userWcaId) {
      return {
        success: false,
        message: "Tu cuenta no tiene un WCA ID asociado",
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
      message: getErrorMessage(error),
    };
  }
}
