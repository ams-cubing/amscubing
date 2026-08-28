import { db } from "@workspace/db";
import {
  evaluateBoardReadiness,
  isSuggestionApplicable,
} from "@workspace/db/board-readiness";
import {
  competitionDelegatesOnly,
  formatNotificationTitle,
  hasRecentNotificationForKind,
  hrefForNotification,
  insertNotifications,
  type AppUrls,
} from "@workspace/db/notifications";

import { sendBoardNotificationEmail } from "@/lib/board-emails";

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
