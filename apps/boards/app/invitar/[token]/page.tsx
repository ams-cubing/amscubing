import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@workspace/db";
import { boardInvites, boardMembers } from "@workspace/db/schema";
import { Button } from "@workspace/ui/components/button";

import { AcceptInviteButton } from "./_components/accept-invite-button";
import { SignInButton } from "@/components/sign-in-button";
import { auth } from "@/lib/auth";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await db.query.boardInvites.findFirst({
    where: and(eq(boardInvites.token, token), isNull(boardInvites.revokedAt)),
    with: {
      board: {
        columns: {
          id: true,
          name: true,
          isTemplate: true,
          archivedAt: true,
        },
      },
    },
  });

  if (!invite || !invite.board || invite.board.isTemplate) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invitación no válida
        </h1>
        <p className="text-muted-foreground">
          Este enlace no existe, fue revocado o el tablero ya no está
          disponible.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Volver a mis tableros</Link>
        </Button>
      </div>
    );
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    const membership = await db.query.boardMembers.findFirst({
      where: and(
        eq(boardMembers.boardId, invite.boardId),
        eq(boardMembers.userId, session.user.id),
      ),
    });
    if (membership) {
      redirect(`/boards/${invite.boardId}`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Unirse al tablero
      </h1>
      <p className="text-muted-foreground">
        Te invitaron a{" "}
        <span className="font-medium text-foreground">{invite.board.name}</span>
        .
        {invite.board.archivedAt
          ? " Este tablero está archivado; podrás verlo pero no editarlo."
          : null}
      </p>
      {session?.user ? (
        <AcceptInviteButton token={token} />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Inicia sesión con WCA para aceptar la invitación.
          </p>
          <SignInButton />
        </div>
      )}
    </div>
  );
}
