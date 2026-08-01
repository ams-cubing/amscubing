"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@workspace/db";
import { competitions, logs } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

export async function cancelCompetition(competitionId: number): Promise<{
  success: boolean;
  message: string;
}> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user?.id) {
    return { success: false, message: "No autenticado" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(competitions)
        .set({
          statusPublic: "suspended",
          statusInternal: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(competitions.id, competitionId));

      await tx.insert(logs).values({
        action: "update_competition",
        targetType: "competition",
        targetId: String(competitionId),
        actorId: session.user.id,
        details: { statusPublic: "suspended", statusInternal: "cancelled" },
      });
    });

    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidatePath("/panel");
    revalidatePath("/");

    return { success: true, message: "Competencia cancelada exitosamente" };
  } catch (error) {
    console.error("Error cancelling competition:", error);
    return { success: false, message: "Error al cancelar la competencia" };
  }
}
