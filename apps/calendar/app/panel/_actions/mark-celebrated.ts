"use server";

import { db } from "@workspace/db";
import { competitions, logs } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireDelegate } from "@/lib/session";

export async function markAsCelebrated(competitionId: number): Promise<{
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
          statusInternal: "celebrated",
          updatedAt: new Date(),
        })
        .where(eq(competitions.id, competitionId));

      await tx.insert(logs).values({
        action: "update_competition",
        targetType: "competition",
        targetId: String(competitionId),
        actorId: session.user.id,
        details: { statusInternal: "celebrated" },
      });
    });

    revalidateTag("competitions", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidatePath("/panel");
    revalidatePath("/");

    return { success: true, message: "Competencia marcada como celebrada" };
  } catch (error) {
    console.error("Error marking competition as celebrated:", error);
    return { success: false, message: "Error al marcar la competencia" };
  }
}
