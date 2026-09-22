"use server";

import { db } from "@workspace/db";
import {
  boards,
  competitionDelegates,
  competitions,
  logs,
} from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import { restoreAvailability } from "@/lib/availability-dates";
import { getErrorMessage } from "@/lib/handle-error";
import { requireDelegate } from "@/lib/session";

export async function deleteCompetition(competitionId: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const authResult = await requireDelegate();
    if (!authResult.ok) {
      return { success: false, message: authResult.message };
    }
    const { session } = authResult;

    await db.transaction(async (tx) => {
      const competition = await tx.query.competitions.findFirst({
        where: eq(competitions.id, competitionId),
        columns: { startDate: true, endDate: true },
      });

      if (competition) {
        const activeDelegates = await tx.query.competitionDelegates.findMany({
          where: and(
            eq(competitionDelegates.competitionId, competitionId),
            inArray(competitionDelegates.status, ["pending", "accepted"]),
          ),
          columns: { delegateWcaId: true },
        });

        for (const row of activeDelegates) {
          await restoreAvailability(
            tx,
            row.delegateWcaId,
            competition.startDate,
            competition.endDate,
          );
        }
      }

      // Break the circular FK (competition.boardId ↔ board.competitionId)
      // then delete the board explicitly before the competition.
      await tx
        .update(competitions)
        .set({ boardId: null, updatedAt: new Date() })
        .where(eq(competitions.id, competitionId));

      await tx.delete(boards).where(eq(boards.competitionId, competitionId));

      await tx.delete(competitions).where(eq(competitions.id, competitionId));

      await tx.insert(logs).values({
        action: "delete_competition",
        targetType: "competition",
        targetId: String(competitionId),
        actorId: session.user.id,
        details: { boardDeleted: true },
      });
    });

    revalidateTag("competitions", "days");
    revalidateTag("competition-public-status-counts", "days");
    revalidateTag("competition-status-internal-counts", "days");
    revalidateTag("competition-state-counts", "days");
    revalidateTag("competition-delegates-counts", "days");
    revalidatePath("/panel/competencias");
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
      message: getErrorMessage(error),
    };
  }
}
