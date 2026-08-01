import Link from "next/link";
import { notFound } from "next/navigation";

import type { User } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/badge";

import { BoardKanban } from "./_components/board-kanban";
import { getBoardForUser } from "@/lib/boards";
import { requireSession } from "@/lib/session";
import { getCalendarUrl } from "@/lib/urls";

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
          <div className="flex flex-wrap items-center gap-2">
            {board.competition && (
              <Badge variant="outline">
                {board.competition.statusPublic}
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
          </div>
        </div>
      </div>
      <BoardKanban board={board} />
    </div>
  );
}
