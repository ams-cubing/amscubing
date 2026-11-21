import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  evaluateBoardReadiness,
  isListTitle,
  isSuggestionApplicable,
  VENUE_PERMISSION_CARD_TITLE,
} from "@workspace/db/board-readiness";
import {
  applyStatusTransition,
  getTransition,
} from "@workspace/db/competition-transitions";
import {
  competitionDelegatesOnly,
  competitionOrganizersOnly,
  formatNotificationTitle,
  hasRecentNotificationForKind,
  hrefForNotification,
  insertNotifications,
  type AppUrls,
} from "@workspace/db/notifications";
import { boards } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

import {
  sendBoardNotificationEmail,
  sendCompetitionStatusChangedEmail,
} from "@/lib/board-emails";

/**
 * When a delegate approves «Permiso de sede», confirm the venue status
 * (confirmed / venue_found) without waiting for the readiness banner.
 */
export async function maybeConfirmVenueFromApprovedCard(input: {
  boardId: number;
  cardTitle: string;
  actorId: string;
  urls: AppUrls;
}): Promise<boolean> {
  if (!isListTitle(input.cardTitle, VENUE_PERMISSION_CARD_TITLE)) {
    return false;
  }

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, input.boardId),
    columns: { competitionId: true },
    with: {
      competition: {
        columns: {
          id: true,
          city: true,
          statusPublic: true,
          statusInternal: true,
        },
      },
    },
  });

  const competition = board?.competition;
  if (!board?.competitionId || !competition) return false;

  const from = {
    statusPublic: competition.statusPublic,
    statusInternal: competition.statusInternal,
  };
  if (!getTransition("confirm_venue").canApply(from)) {
    return false;
  }

  const applied = await db.transaction(async (tx) =>
    applyStatusTransition(tx, {
      competitionId: board.competitionId!,
      actorId: input.actorId,
      transitionId: "confirm_venue",
      source: "board_readiness",
      suggestionKind: "confirm_venue",
      urls: input.urls,
      extraLogDetails: { trigger: "venue_permission_approved" },
    }),
  );

  try {
    const organizers = await competitionOrganizersOnly(
      db,
      board.competitionId,
    );
    for (const organizer of organizers) {
      if (!organizer.email || !organizer.name) continue;
      if (organizer.id === input.actorId) continue;
      try {
        await sendCompetitionStatusChangedEmail({
          to: organizer.email,
          recipientName: organizer.name,
          city: applied.city,
          statusLabel: applied.statusLabel,
        });
      } catch (err) {
        log.error("boards.organizer_status_email_failed", { error: err });
      }
    }
  } catch (err) {
    log.error("boards.notify_organizers_failed", { error: err });
  }

  return true;
}

export async function maybeNotifyReadinessSuggestion(
  boardId: number,
  actorId: string,
  urls: AppUrls,
) {
  const readiness = await evaluateBoardReadiness(boardId);
  if (!readiness?.suggestion || !isSuggestionApplicable(readiness.suggestion)) {
    return;
  }

  const { suggestion } = readiness;
  const alreadyNotified = await hasRecentNotificationForKind(db, {
    type: "competition_readiness",
    competitionId: readiness.competitionId,
    suggestionKind: suggestion.kind,
  });
  if (alreadyNotified) return;

  const delegates = await competitionDelegatesOnly(db, readiness.competitionId);

  await db.transaction(async (tx) => {
    await insertNotifications(
      tx,
      delegates.map((delegate) => ({
        recipientId: delegate.id,
        actorId,
        type: "competition_readiness" as const,
        title: formatNotificationTitle("competition_readiness", {
          city: readiness.city,
          statusLabel: suggestion.label,
        }),
        href: hrefForNotification("competition_readiness", {
          urls,
          recipientRole: delegate.role,
          boardId,
          competitionId: readiness.competitionId,
        }),
        payload: {
          boardId,
          competitionId: readiness.competitionId,
          city: readiness.city,
          statusLabel: suggestion.label,
          suggestionKind: suggestion.kind,
          statusPublic: suggestion.targetStatusPublic,
          statusInternal: suggestion.targetStatusInternal,
        },
      })),
    );
  });

  const boardsUrl = urls.boardsUrl.replace(/\/$/, "");
  const calendarUrl = urls.calendarUrl.replace(/\/$/, "");

  for (const delegate of delegates) {
    await sendBoardNotificationEmail({
      to: delegate.email ?? "",
      recipientName: delegate.name,
      subject: `Tablero listo: ${suggestion.label} — ${readiness.city}`,
      title: suggestion.label,
      bodyHtml: `<p>${suggestion.description}</p>`,
      ctaLabel:
        suggestion.kindLabel === "announce_ready"
          ? "Ir al calendario"
          : "Ver tablero",
      ctaHref:
        suggestion.kindLabel === "announce_ready"
          ? `${calendarUrl}/panel/competencias/${readiness.competitionId}`
          : `${boardsUrl}/boards/${boardId}`,
    });
  }
}

export async function notifyHechoReview(input: {
  boardId: number;
  cardId: number;
  cardTitle: string;
  city: string;
  competitionId: number;
  actor: { id: string; name: string | null };
  urls: AppUrls;
}) {
  const delegates = await competitionDelegatesOnly(db, input.competitionId);
  const recipients = delegates.filter(
    (delegate) => delegate.id !== input.actor.id,
  );
  if (recipients.length === 0) return;

  await db.transaction(async (tx) => {
    await insertNotifications(
      tx,
      recipients.map((delegate) => ({
        recipientId: delegate.id,
        actorId: input.actor.id,
        type: "card_ready_for_review" as const,
        title: formatNotificationTitle("card_ready_for_review", {
          cardTitle: input.cardTitle,
          actorName: input.actor.name ?? undefined,
        }),
        href: hrefForNotification("card_ready_for_review", {
          urls: input.urls,
          recipientRole: delegate.role,
          boardId: input.boardId,
          cardId: input.cardId,
        }),
        payload: {
          boardId: input.boardId,
          cardId: input.cardId,
          cardTitle: input.cardTitle,
          competitionId: input.competitionId,
          city: input.city,
          actorName: input.actor.name ?? undefined,
        },
      })),
    );
  });

  const boardHref = `${input.urls.boardsUrl.replace(/\/$/, "")}/boards/${input.boardId}?card=${input.cardId}`;

  for (const delegate of recipients) {
    await sendBoardNotificationEmail({
      to: delegate.email ?? "",
      recipientName: delegate.name,
      subject: `Revisión pendiente: ${input.cardTitle}`,
      title: `${input.actor.name ?? "Un organizador"} marcó «${input.cardTitle}» como hecho`,
      bodyHtml: `<p>Revisa la tarjeta en el tablero de ${input.city}.</p>`,
      ctaLabel: "Ver tarjeta",
      ctaHref: boardHref,
    });
  }
}
