import Link from "next/link";

import type { Competition } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
      {boards.map((board) => (
        <li key={board.id}>
          <Button
            asChild
            variant="outline"
            className="h-auto w-full justify-start px-4 py-4"
          >
            <Link href={`/boards/${board.id}`}>
              <div className="flex w-full flex-col items-start gap-1 text-left">
                <span className="font-medium">{board.name}</span>
                {board.competition ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    {board.competition.city}
                    {board.competition.startDate
                      ? ` · ${board.competition.startDate}`
                      : ""}
                  </span>
                ) : showBlankBadge ? (
                  <Badge variant="secondary" className="mt-1">
                    Sin competencia
                  </Badge>
                ) : null}
                {board.competition?.statusPublic && (
                  <Badge
                    className={cn(
                      "mt-1 border-transparent",
                      getPublicStatusColor(board.competition.statusPublic),
                    )}
                  >
                    {formatPublicStatus(board.competition.statusPublic)}
                  </Badge>
                )}
                {board.archivedAt && (
                  <Badge variant="outline" className="mt-1">
                    Archivado
                  </Badge>
                )}
              </div>
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
