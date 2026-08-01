"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@workspace/db";
import { competitions, logs } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

export async function markAsCelebrated(competitionId: number): Promise<{
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
