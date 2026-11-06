"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

import { db } from "@workspace/db";
import {
  DELEGATES_BOARD_NAME,
  isDelegatesBoard,
  isDelegatesBoardName,
} from "@workspace/db/delegates-board";
import {
  formatNotificationTitle,
  hrefForNotification,
  insertNotifications,
} from "@workspace/db/notifications";
import { boardInvites, boardMembers, boards } from "@workspace/db/schema";

import { requireDelegate, requireSessionOrUnauthorized } from "@/lib/session";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";
import {
  createBlankBoardSchema,
  createTemplateSchema,
} from "@/app/_lib/validations";

async function requireDelegateUser() {
  const result = await requireDelegate();
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.session.user;
}

function assertNameNotReserved(name: string) {
  if (isDelegatesBoardName(name)) {
    throw new Error(
      `«${DELEGATES_BOARD_NAME}» es el nombre del tablero de delegados`,
    );
  }
}

async function assertNotDelegatesBoard(boardId: number, message: string) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { name: true, isTemplate: true, competitionId: true },
  });
  if (board && isDelegatesBoard(board)) {
    throw new Error(message);
  }
}

export async function createBlankBoard(formData: FormData) {
  await requireDelegateUser();
  const { name } = createBlankBoardSchema.parse({
    name: String(formData.get("name") ?? ""),
  });
  assertNameNotReserved(name);

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
  await requireDelegateUser();
  const { name } = createTemplateSchema.parse({
    name: String(formData.get("name") ?? ""),
  });
  assertNameNotReserved(name);

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
  await requireDelegateUser();
  const { name } = createBlankBoardSchema.parse({ name: input.name });
  assertNameNotReserved(name);
  await assertNotDelegatesBoard(
    input.boardId,
    "El tablero de delegados no se puede renombrar",
  );

  await db
    .update(boards)
    .set({ name, updatedAt: new Date() })
    .where(eq(boards.id, input.boardId));

  revalidatePath("/");
  revalidatePath(`/boards/${input.boardId}`);
}

export async function deleteBoard(input: { boardId: number }) {
  await requireDelegateUser();
  await assertNotDelegatesBoard(
    input.boardId,
    "El tablero de delegados no se puede eliminar",
  );

  await db.delete(boards).where(eq(boards.id, input.boardId));

  revalidatePath("/");
  return { ok: true as const };
}

export async function unarchiveBoard(input: { boardId: number }) {
  await requireDelegateUser();

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
  const currentUser = await requireDelegateUser();

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, input.boardId),
    columns: { id: true, name: true, isTemplate: true, competitionId: true },
  });

  if (!board) {
    throw new Error("Tablero no encontrado");
  }
  if (board.isTemplate) {
    throw new Error("No se pueden invitar a plantillas");
  }
  if (isDelegatesBoard(board)) {
    throw new Error("El tablero de delegados no admite invitaciones");
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
  await requireDelegateUser();

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
  await requireDelegateUser();

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
  const session = await requireSessionOrUnauthorized();
  const currentUser = session.user;

  const invite = await db.query.boardInvites.findFirst({
    where: eq(boardInvites.token, token),
    with: {
      board: {
        columns: {
          id: true,
          name: true,
          isTemplate: true,
          competitionId: true,
          archivedAt: true,
        },
      },
    },
  });

  if (!invite || invite.revokedAt) {
    throw new Error("Invitación no válida o revocada");
  }
  if (
    !invite.board ||
    invite.board.isTemplate ||
    isDelegatesBoard(invite.board)
  ) {
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
