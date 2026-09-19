import Link from "next/link";

import type { Competition } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import {
  formatPublicStatus,
  getPublicStatusColor,
} from "@/lib/competition-status";

type BoardListItem = {
  id: number;
  name: string;
  competitionId?: number | null;
  archivedAt?: Date | null;
  competition?: {
    id: number;
    name: string | null;
    city: string;
    startDate: string | null;
    statusPublic: Competition["statusPublic"] | null;
  } | null;
};

export function BoardList({
  boards,
  emptyMessage,
  showBlankBadge = true,
}: {
  boards: BoardListItem[];
  emptyMessage: string;
  showBlankBadge?: boolean;
}) {
  if (boards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {boards.map((board) => {
        const statusBadge = board.competition?.statusPublic ? (
          <Badge
            className={cn(
              "shrink-0 border-transparent",
              getPublicStatusColor(board.competition.statusPublic),
            )}
          >
            {formatPublicStatus(board.competition.statusPublic)}
          </Badge>
        ) : null;

        const blankBadge =
          !board.competition && showBlankBadge ? (
            <Badge variant="secondary" className="shrink-0">
              Sin competencia
            </Badge>
          ) : null;

        const archivedBadge = board.archivedAt ? (
          <Badge variant="outline" className="shrink-0">
            Archivado
          </Badge>
        ) : null;

        return (
          <li key={board.id}>
            <Link
              href={`/boards/${board.id}`}
              className={cn(
                "flex min-h-20 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5",
                "transition-colors hover:bg-accent/40 focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              <div className="min-w-0 space-y-1">
                <span className="block truncate font-medium">{board.name}</span>
                {board.competition ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {board.competition.city}
                    {board.competition.startDate
                      ? ` · ${board.competition.startDate}`
                      : ""}
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                {blankBadge}
                {statusBadge}
                {archivedBadge}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
