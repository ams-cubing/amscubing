"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/db";
import { holidays } from "@workspace/db/schema";

import { requireDelegate } from "@/lib/session";
import { getErrorMessage } from "@/lib/handle-error";

const holidaySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  official: z.boolean(),
});

export async function createHoliday(data: z.infer<typeof holidaySchema>) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }

  try {
    const validated = holidaySchema.parse(data);

    await db.insert(holidays).values({
      name: validated.name.trim(),
      date: validated.date,
      official: validated.official,
    });

    revalidatePath("/panel/feriados");
    revalidatePath("/");

    return { success: true, message: "Feriado creado" };
  } catch (error) {
    console.error("Error creating holiday:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function updateHoliday(
  id: number,
  data: z.infer<typeof holidaySchema>,
) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }

  try {
    const validated = holidaySchema.parse(data);

    await db
      .update(holidays)
      .set({
        name: validated.name.trim(),
        date: validated.date,
        official: validated.official,
      })
      .where(eq(holidays.id, id));

    revalidatePath("/panel/feriados");
    revalidatePath("/");

    return { success: true, message: "Feriado actualizado" };
  } catch (error) {
    console.error("Error updating holiday:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function deleteHoliday(id: number) {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }

  try {
    await db.delete(holidays).where(eq(holidays.id, id));

    revalidatePath("/panel/feriados");
    revalidatePath("/");

    return { success: true, message: "Feriado eliminado" };
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return { success: false, message: getErrorMessage(error) };
  }
}
