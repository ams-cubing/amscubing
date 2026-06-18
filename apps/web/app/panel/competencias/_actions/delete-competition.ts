"use server";

import { db } from "@/db";
import { competitions, logs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

export async function deleteCompetition(competitionId: number): Promise<{
  success: boolean;
  message: string;
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

    await db.transaction(async (tx) => {
      await tx.delete(competitions).where(eq(competitions.id, competitionId));

      if (session?.user?.id) {
        await tx.insert(logs).values({
          action: "delete_competition",
          targetType: "competition",
          targetId: String(competitionId),
          actorId: session.user.id,
          details: null,
        });
      }
    });

    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidateTag("competition-state-counts", "days");
    revalidateTag("competition-delegates-counts", "days");
    revalidatePath("/panel");
    revalidatePath("/");

    return {
      success: true,
      message: "Competencia eliminada",
    };
  } catch (error) {
    console.error("Error deleting competition:", error);
    return {
      success: false,
      message: "Error al eliminar la competencia",
    };
  }
}
