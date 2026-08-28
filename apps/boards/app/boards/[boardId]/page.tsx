import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import type { User } from "@workspace/db/schema";
import { db } from "@workspace/db";
import { evaluateBoardReadiness } from "@workspace/db/board-readiness";
import { boardInvites } from "@workspace/db/schema";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { AvatarGroup } from "@workspace/ui/components/avatar-group";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { BoardKanban } from "./_components/board-kanban";
import { BoardReadinessBanner } from "./_components/board-readiness-banner";
import { BoardDelegateControls } from "./_components/board-delegate-controls";
import { getBoardForUser } from "@/lib/boards";
import {
  formatPublicStatus,
  getPublicStatusColor,
} from "@/lib/competition-status";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ card?: string | string[] }>;
}) {
  const { boardId: boardIdParam } = await params;
  const { card: cardParam } = await searchParams;
  const boardId = Number(boardIdParam);
  if (!Number.isFinite(boardId)) notFound();

  const cardRaw = Array.isArray(cardParam) ? cardParam[0] : cardParam;
  const parsedCardId = cardRaw ? Number(cardRaw) : NaN;
  const initialCardId = Number.isFinite(parsedCardId) ? parsedCardId : null;

  const session = await requireSessionOrUnauthorized();
  const user = session.user as unknown as User;
  const board = await getBoardForUser(user, boardId);

  if (!board) notFound();

  const readiness = board.competition
    ? await evaluateBoardReadiness(boardId)
    : null;

  const isDelegate = user.role === "delegate";
  const isArchived = Boolean(board.archivedAt);
  const calendarUrl = getCalendarUrl();
  const competitionHref = board.competition
    ? `${calendarUrl}/panel/competencias/${board.competition.id}`
    : null;

  const activeInvite =
    isDelegate && !board.isTemplate
      ? await db.query.boardInvites.findFirst({
          where: and(
            eq(boardInvites.boardId, boardId),
            isNull(boardInvites.revokedAt),
          ),
        })
      : null;

  const teamPeople = (() => {
    const byWcaId = new Map<
      string,
      {
        wcaId: string;
        name: string;
        image: string | null;
        isPrimary: boolean;
      }
    >();

    if (board.competition) {
      for (const row of board.competition.delegates) {
        if (!row.delegate) continue;
        byWcaId.set(row.delegate.wcaId, {
          wcaId: row.delegate.wcaId,
          name: row.delegate.name,
          image: row.delegate.image,
          isPrimary: row.isPrimary,
        });
      }
      for (const row of board.competition.organizers) {
        if (!row.organizer) continue;
        const existing = byWcaId.get(row.organizer.wcaId);
        byWcaId.set(row.organizer.wcaId, {
          wcaId: row.organizer.wcaId,
          name: row.organizer.name,
          image: row.organizer.image,
          isPrimary: existing?.isPrimary || row.isPrimary,
        });
      }
    }

    for (const row of board.members ?? []) {
      if (!row.user) continue;
      if (byWcaId.has(row.user.wcaId)) continue;
      byWcaId.set(row.user.wcaId, {
        wcaId: row.user.wcaId,
        name: row.user.name,
        image: row.user.image,
        isPrimary: false,
      });
    }

    return [...byWcaId.values()].sort(
      (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
    );
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {isArchived && (
        <div className="shrink-0 border-b bg-muted/50 px-4 py-2 text-center text-sm text-muted-foreground">
          Este tablero está archivado y no se puede editar.
          {isDelegate ? " Puedes desarchivarlo o eliminarlo." : ""}
        </div>
      )}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">
                {board.name}
              </h1>
              {board.isTemplate && <Badge variant="secondary">Plantilla</Badge>}
              {isArchived && <Badge variant="outline">Archivado</Badge>}
              {!board.isTemplate && !board.competition && (
                <Badge variant="secondary">Sin competencia</Badge>
              )}
            </div>
            {board.competition && (
              <p className="text-sm text-muted-foreground">
                {board.competition.city}
                {board.competition.startDate
                  ? ` · ${board.competition.startDate}`
                  : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {teamPeople.length > 0 ? (
              <AvatarGroup size={24}>
                {teamPeople.map((person) => (
                  <Avatar
                    key={person.wcaId}
                    title={`${person.name}${person.isPrimary ? " (Principal)" : ""}`}
                  >
                    <AvatarImage
                      src={person.image || undefined}
                      alt={person.name}
                    />
                    <AvatarFallback>{initials(person.name)}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            ) : board.competition ? (
              <span className="text-sm text-muted-foreground">Sin equipo</span>
            ) : null}
            {board.competition && (
              <Badge
                className={cn(
                  "border-transparent",
                  getPublicStatusColor(board.competition.statusPublic),
                )}
              >
                {formatPublicStatus(board.competition.statusPublic)}
              </Badge>
            )}
            {competitionHref && (
              <Link
                href={competitionHref}
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Ver en calendario
              </Link>
            )}
            {isDelegate && (
              <BoardDelegateControls
                boardId={board.id}
                boardName={board.name}
                isTemplate={board.isTemplate}
                isArchived={isArchived}
                inviteUrl={
                  activeInvite
                    ? `${getBoardsUrl()}/invitar/${activeInvite.token}`
                    : null
                }
                inviteId={activeInvite?.id ?? null}
                members={(board.members ?? [])
                  .filter((m) => m.user)
                  .map((m) => ({
                    userId: m.user.id,
                    name: m.user.name,
                    wcaId: m.user.wcaId,
                  }))}
              />
            )}
          </div>
        </div>
      </div>
      {readiness?.suggestion && !board.isTemplate ? (
        <BoardReadinessBanner
          boardId={boardId}
          suggestion={readiness.suggestion}
          competitionHref={competitionHref}
          isDelegate={isDelegate}
        />
      ) : null}
      <BoardKanban
        board={board}
        readOnly={isArchived}
        initialCardId={initialCardId}
      />
    </div>
  );
}
