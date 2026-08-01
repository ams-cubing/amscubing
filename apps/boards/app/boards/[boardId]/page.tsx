import Link from "next/link";
import { notFound } from "next/navigation";

import type { User } from "@workspace/db/schema";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { AvatarGroup } from "@workspace/ui/components/avatar-group";
import { Badge } from "@workspace/ui/components/badge";

import { BoardKanban } from "./_components/board-kanban";
import { getBoardForUser } from "@/lib/boards";
import { requireSession } from "@/lib/session";
import { getCalendarUrl } from "@/lib/urls";

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
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId: boardIdParam } = await params;
  const boardId = Number(boardIdParam);
  if (!Number.isFinite(boardId)) notFound();

  const session = await requireSession();
  const user = session.user as unknown as User;
  const board = await getBoardForUser(user, boardId);

  if (!board) notFound();

  const calendarUrl = getCalendarUrl();
  const competitionHref = board.competition
    ? `${calendarUrl}/panel/competencias/${board.competition.id}`
    : null;

  const teamPeople = (() => {
    if (!board.competition) return [];
    const byWcaId = new Map<
      string,
      {
        wcaId: string;
        name: string;
        image: string | null;
        isPrimary: boolean;
      }
    >();

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

    return [...byWcaId.values()].sort(
      (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
    );
  })();

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-4 py-3">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {board.name}
            </h1>
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
            {board.competition &&
              (teamPeople.length > 0 ? (
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
              ) : (
                <span className="text-sm text-muted-foreground">
                  Sin equipo
                </span>
              ))}
            {board.competition && (
              <Badge variant="outline">{board.competition.statusPublic}</Badge>
            )}
            {competitionHref && (
              <Link
                href={competitionHref}
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Ver en calendario
              </Link>
            )}
          </div>
        </div>
      </div>
      <BoardKanban board={board} />
    </div>
  );
}
