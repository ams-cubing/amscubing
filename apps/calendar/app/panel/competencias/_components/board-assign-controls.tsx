"use client";

import { ExternalLink, LayoutDashboard, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { getBoardsUrl, isBoardsEnabled } from "@/lib/boards";

import { assignBoardToCompetition } from "../_actions/assign-board";

export function BoardAssignControls({
  competitionId,
  boardId,
}: {
  competitionId: number;
  boardId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const boardsUrl = getBoardsUrl();

  if (!isBoardsEnabled()) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="text-sm font-medium">Tablero AMS</div>
      <p className="text-sm text-muted-foreground">
        Asigna un tablero clonado de la plantilla AMS para organizadores.
      </p>
      <div className="flex flex-wrap gap-2">
        {boardId ? (
          <Button asChild>
            <a
              href={`${boardsUrl}/boards/${boardId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              Abrir tablero
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await assignBoardToCompetition(competitionId);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Tablero asignado");
                router.refresh();
              });
            }}
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LayoutDashboard className="size-4" />
            )}
            Asignar tablero
          </Button>
        )}
      </div>
    </div>
  );
}
