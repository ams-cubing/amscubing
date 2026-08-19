"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

import { db } from "@workspace/db";
import {
  formatNotificationTitle,
  hrefForNotification,
  insertNotifications,
} from "@workspace/db/notifications";
import {
  boardInvites,
  boardMembers,
  boards,
  type User,
} from "@workspace/db/schema";

import { requireSession } from "@/lib/session";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";

async function requireDelegate() {
  const session = await requireSession();
  const currentUser = session.user as unknown as User;
  if (currentUser.role !== "delegate") {
    throw new Error("Solo delegados pueden realizar esta acción");
  }
  return currentUser;
}

function normalizeName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("El nombre es obligatorio");
  }
  return trimmed;
}

export async function createBlankBoard(formData: FormData) {
  await requireDelegate();
  const name = normalizeName(String(formData.get("name") ?? ""));

  const [board] = await db
    .insert(boards)
    .values({
      name,
      isTemplate: false,
      competitionId: null,
    })
    .returning({ id: boards.id });

  if (!board) {
    throw new Error("No se pudo crear el tablero");
  }

  revalidatePath("/");
  redirect(`/boards/${board.id}`);
}

export async function createTemplate(formData: FormData) {
  await requireDelegate();
  const name = normalizeName(String(formData.get("name") ?? ""));

  const [board] = await db
    .insert(boards)
    .values({
      name,
      isTemplate: true,
      competitionId: null,
    })
    .returning({ id: boards.id });

  if (!board) {
    throw new Error("No se pudo crear la plantilla");
  }

  revalidatePath("/");
  redirect(`/boards/${board.id}`);
}

export async function renameBoard(input: { boardId: number; name: string }) {
  await requireDelegate();
  const name = normalizeName(input.name);

  await db
    .update(boards)
    .set({ name, updatedAt: new Date() })
    .where(eq(boards.id, input.boardId));

  revalidatePath("/");
  revalidatePath(`/boards/${input.boardId}`);
}

export async function deleteBoard(input: { boardId: number }) {
  await requireDelegate();

  await db.delete(boards).where(eq(boards.id, input.boardId));

  revalidatePath("/");
  return { ok: true as const };
}

export async function unarchiveBoard(input: { boardId: number }) {
  await requireDelegate();

  await db
    .update(boards)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(boards.id, input.boardId));

  revalidatePath("/");
  revalidatePath(`/boards/${input.boardId}`);
}

export async function createBoardInvite(input: {
  boardId: number;
  rotate?: boolean;
}) {
  const currentUser = await requireDelegate();

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, input.boardId),
    columns: { id: true, isTemplate: true },
  });

  if (!board) {
    throw new Error("Tablero no encontrado");
  }
  if (board.isTemplate) {
    throw new Error("No se pueden invitar a plantillas");
  }

  if (input.rotate) {
    await db
      .update(boardInvites)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(boardInvites.boardId, input.boardId),
          isNull(boardInvites.revokedAt),
        ),
      );
  } else {
    const existing = await db.query.boardInvites.findFirst({
      where: and(
        eq(boardInvites.boardId, input.boardId),
        isNull(boardInvites.revokedAt),
      ),
    });

    if (existing) {
      return {
        inviteId: existing.id,
        url: `${getBoardsUrl()}/invitar/${existing.token}`,
      };
    }
  }

  const token = randomBytes(24).toString("base64url");
  const [invite] = await db
    .insert(boardInvites)
    .values({
      boardId: input.boardId,
      token,
      createdByUserId: currentUser.id,
    })
    .returning();

  if (!invite) {
    throw new Error("No se pudo crear la invitación");
  }

  return {
    inviteId: invite.id,
    url: `${getBoardsUrl()}/invitar/${invite.token}`,
  };
}

export async function revokeBoardInvite(input: { inviteId: number }) {
  await requireDelegate();

  const invite = await db.query.boardInvites.findFirst({
    where: eq(boardInvites.id, input.inviteId),
    columns: { boardId: true },
  });

  await db
    .update(boardInvites)
    .set({ revokedAt: new Date() })
    .where(eq(boardInvites.id, input.inviteId));

  revalidatePath("/");
  if (invite) {
    revalidatePath(`/boards/${invite.boardId}`);
  }
}

export async function removeBoardMember(input: {
  boardId: number;
  userId: string;
}) {
  await requireDelegate();

  await db
    .delete(boardMembers)
    .where(
      and(
        eq(boardMembers.boardId, input.boardId),
        eq(boardMembers.userId, input.userId),
      ),
    );

  revalidatePath(`/boards/${input.boardId}`);
}

export async function acceptBoardInvite(token: string) {
  const session = await requireSession();
  const currentUser = session.user as unknown as User;

  const invite = await db.query.boardInvites.findFirst({
    where: eq(boardInvites.token, token),
    with: {
      board: {
        columns: { id: true, name: true, isTemplate: true, archivedAt: true },
      },
    },
  });

  if (!invite || invite.revokedAt) {
    throw new Error("Invitación no válida o revocada");
  }
  if (!invite.board || invite.board.isTemplate) {
    throw new Error("Invitación no válida");
  }

  const [inserted] = await db
    .insert(boardMembers)
    .values({
      boardId: invite.boardId,
      userId: currentUser.id,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    await insertNotifications(db, [
      {
        recipientId: invite.createdByUserId,
        actorId: currentUser.id,
        type: "board_member_joined",
        title: formatNotificationTitle("board_member_joined", {
          actorName: currentUser.name,
          boardName: invite.board.name,
        }),
        href: hrefForNotification("board_member_joined", {
          urls: {
            calendarUrl: getCalendarUrl(),
            boardsUrl: getBoardsUrl(),
          },
          recipientRole: "delegate",
          boardId: invite.boardId,
        }),
        payload: {
          boardId: invite.boardId,
          boardName: invite.board.name,
          actorName: currentUser.name,
        },
      },
    ]);
  }

  revalidatePath("/");
  return { boardId: invite.boardId };
}
