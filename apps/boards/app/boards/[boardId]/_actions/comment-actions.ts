"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@workspace/db";
import {
  parseMentions,
  resolveAllMentionedUsers,
  resolveMentionedUsers,
} from "@workspace/db/mentions";
import {
  boardTeamByRole,
  boardTeamUsers,
  formatNotificationTitle,
  hrefForNotification,
  insertNotifications,
} from "@workspace/db/notifications";
import { boards, cardComments, cardMembers, cards } from "@workspace/db/schema";

import { sendBoardNotificationEmail } from "@/lib/board-emails";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";
import { addCardCommentSchema } from "@/app/_lib/validations";

import { requireBoardAccess } from "../_lib/board-access";

export async function addCardCommentAction(input: {
  boardId: number;
  cardId: number;
  body: string;
}) {
  const validated = addCardCommentSchema.parse(input);
  const user = await requireBoardAccess(validated.boardId);
  const body = validated.body;

  const [team, roleGroups] = await Promise.all([
    boardTeamUsers(db, validated.boardId),
    boardTeamByRole(db, validated.boardId),
  ]);
  const parsedMentions = parseMentions(body);
  const mentioned = resolveAllMentionedUsers(parsedMentions, roleGroups);

  const resolvedUserMentions = resolveMentionedUsers(
    parsedMentions.userWcaIds,
    roleGroups.all,
  );
  if (parsedMentions.userWcaIds.length > resolvedUserMentions.length) {
    throw new Error("Una o más menciones no son válidas para este tablero");
  }

  const mentionedIds = new Set(mentioned.map((member) => member.userId));
  const emailRecipients: { email: string; name: string }[] = [];

  await db.transaction(async (tx) => {
    await tx.insert(cardComments).values({
      cardId: input.cardId,
      authorId: user.id,
      body,
    });

    const members = await tx.query.cardMembers.findMany({
      where: eq(cardMembers.cardId, input.cardId),
      columns: { userId: true },
    });
    const card = await tx.query.cards.findFirst({
      where: eq(cards.id, input.cardId),
      columns: { title: true },
    });
    const board = await tx.query.boards.findFirst({
      where: eq(boards.id, input.boardId),
      columns: { name: true },
    });
    const urls = {
      calendarUrl: getCalendarUrl(),
      boardsUrl: getBoardsUrl(),
    };
    const cardHref = hrefForNotification("card_mention", {
      urls,
      recipientRole: "user",
      boardId: input.boardId,
      cardId: input.cardId,
    });

    const mentionRows = mentioned.map((member) => {
      const profile = team.find((person) => person.id === member.userId);
      if (profile?.email) {
        emailRecipients.push({ email: profile.email, name: profile.name });
      }

      return {
        recipientId: member.userId,
        actorId: user.id,
        type: "card_mention" as const,
        title: formatNotificationTitle("card_mention", {
          cardTitle: card?.title,
          actorName: user.name,
        }),
        href: cardHref,
        payload: {
          boardId: input.boardId,
          boardName: board?.name,
          cardId: input.cardId,
          cardTitle: card?.title,
          actorName: user.name,
        },
      };
    });

    const commentRows = members
      .filter((member) => !mentionedIds.has(member.userId))
      .map((member) => ({
        recipientId: member.userId,
        actorId: user.id,
        type: "card_comment" as const,
        title: formatNotificationTitle("card_comment", {
          cardTitle: card?.title,
        }),
        href: hrefForNotification("card_comment", {
          urls,
          recipientRole: "user",
          boardId: input.boardId,
          cardId: input.cardId,
        }),
        payload: {
          boardId: input.boardId,
          boardName: board?.name,
          cardId: input.cardId,
          cardTitle: card?.title,
          actorName: user.name,
        },
      }));

    await insertNotifications(tx, [...mentionRows, ...commentRows]);
  });

  const boardHref = `${getBoardsUrl().replace(/\/$/, "")}/boards/${input.boardId}?card=${input.cardId}`;
  for (const recipient of emailRecipients) {
    await sendBoardNotificationEmail({
      to: recipient.email,
      recipientName: recipient.name,
      subject: `${user.name} te mencionó en un comentario`,
      title: `${user.name} te mencionó en un comentario`,
      bodyHtml: `<p>${body.replaceAll("\n", "<br/>")}</p>`,
      ctaLabel: "Ver comentario",
      ctaHref: boardHref,
    });
  }

  revalidatePath(`/boards/${input.boardId}`);
}

export async function deleteCardCommentAction(input: {
  boardId: number;
  commentId: number;
}) {
  const user = await requireBoardAccess(input.boardId);

  const comment = await db.query.cardComments.findFirst({
    where: eq(cardComments.id, input.commentId),
  });
  if (!comment) throw new Error("Comentario no encontrado");

  if (comment.authorId !== user.id && user.role !== "delegate") {
    throw new Error("No puedes eliminar este comentario");
  }

  await db.delete(cardComments).where(eq(cardComments.id, input.commentId));

  revalidatePath(`/boards/${input.boardId}`);
}
