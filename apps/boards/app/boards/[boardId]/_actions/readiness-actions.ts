"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import { db } from "@workspace/db";
import {
  evaluateBoardReadiness,
  isSuggestionApplicable,
} from "@workspace/db/board-readiness";
import {
  competitionNotificationRow,
  competitionOrganizersOnly,
  competitionTeamUsers,
  formatInternalStatusLabel,
  formatPublicStatusLabel,
  insertNotifications,
} from "@workspace/db/notifications";
import { competitions, logs } from "@workspace/db/schema";

import { canAccessBoard, isBoardArchived } from "@/lib/boards";
import { sendCompetitionStatusChangedEmail } from "@/lib/board-emails";
import { requireDelegate } from "@/lib/session";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";

async function requireDelegateBoardAccess(boardId: number) {
  const delegateResult = await requireDelegate();
  if (!delegateResult.ok) {
    throw new Error(delegateResult.message);
  }
  const currentUser = delegateResult.session.user;
  const allowed = await canAccessBoard(currentUser, boardId);
  if (!allowed) {
    throw new Error("No tienes acceso a este tablero");
  }
  if (await isBoardArchived(boardId)) {
    throw new Error("Este tablero está archivado");
  }
  return currentUser;
}

export async function applyReadinessSuggestionAction(input: {
  boardId: number;
  kind: string;
}) {
  const actor = await requireDelegateBoardAccess(input.boardId);
  const readiness = await evaluateBoardReadiness(input.boardId);

  if (!readiness?.suggestion) {
    throw new Error("No hay sugerencia de estatus disponible");
  }

  const suggestion = readiness.suggestion;

  if (suggestion.kind !== input.kind) {
    throw new Error("La sugerencia ya no está disponible");
  }

  if (!isSuggestionApplicable(suggestion)) {
    throw new Error("Aún faltan tarjetas por aprobar");
  }

  if (suggestion.kindLabel === "announce_ready") {
    throw new Error("Usa el calendario para anunciar la competencia");
  }

  const { targetStatusPublic, targetStatusInternal } = suggestion;
  if (!targetStatusPublic || !targetStatusInternal) {
    throw new Error("Sugerencia inválida");
  }

  const urls = {
    calendarUrl: getCalendarUrl(),
    boardsUrl: getBoardsUrl(),
  };

  const statusLabel =
    targetStatusPublic !== readiness.statusPublic
      ? formatPublicStatusLabel(targetStatusPublic)
      : formatInternalStatusLabel(targetStatusInternal);

  await db.transaction(async (tx) => {
    await tx
      .update(competitions)
      .set({
        statusPublic:
          targetStatusPublic as typeof competitions.$inferSelect.statusPublic,
        statusInternal:
          targetStatusInternal as typeof competitions.$inferSelect.statusInternal,
        updatedAt: new Date(),
      })
      .where(eq(competitions.id, readiness.competitionId));

    await tx.insert(logs).values({
      action: "update_competition",
      targetType: "competition",
      targetId: String(readiness.competitionId),
      actorId: actor.id,
      details: {
        statusPublic: targetStatusPublic,
        statusInternal: targetStatusInternal,
        source: "board_readiness",
        suggestionKind: suggestion.kind,
      },
    });

    const team = await competitionTeamUsers(tx, readiness.competitionId);
    await insertNotifications(
      tx,
      team.map((recipient) =>
        competitionNotificationRow({
          recipient,
          actorId: actor.id,
          type: "competition_status_changed",
          urls,
          competitionId: readiness.competitionId,
          city: readiness.city,
          statusLabel,
          statusPublic: targetStatusPublic,
          statusInternal: targetStatusInternal,
        }),
      ),
    );
  });

  try {
    const organizers = await competitionOrganizersOnly(
      db,
      readiness.competitionId,
    );
    for (const organizer of organizers) {
      if (!organizer.email || !organizer.name) continue;
      if (organizer.id === actor.id) continue;
      try {
        await sendCompetitionStatusChangedEmail({
          to: organizer.email,
          recipientName: organizer.name,
          city: readiness.city,
          statusLabel,
        });
      } catch (err) {
        console.error("Error sending organizer status email via Resend:", err);
      }
    }
  } catch (err) {
    console.error("Error notifying organizers:", err);
  }

  revalidatePath(`/boards/${input.boardId}`);
  revalidateTag(`competition-${readiness.competitionId}`, "days");
  revalidateTag("competitions", "days");
  revalidateTag("competition-public-status-counts", "days");
  revalidateTag("competition-status-internal-counts", "days");

  return { success: true as const, label: suggestion.label };
}
