"use server";

import { db } from "@workspace/db";
import { boards, competitions, logs } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireDelegate } from "@/lib/session";

export async function cancelCompetition(competitionId: number): Promise<{
  success: boolean;
  message: string;
}> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }
  const { session } = authResult;

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

      await tx
        .update(boards)
        .set({
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(boards.competitionId, competitionId));

      await tx.insert(logs).values({
        action: "update_competition",
        targetType: "competition",
        targetId: String(competitionId),
        actorId: session.user.id,
        details: {
          statusPublic: "suspended",
          statusInternal: "cancelled",
          boardArchived: true,
        },
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
