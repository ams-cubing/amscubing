"use client";

import { ExternalLink, LayoutDashboard, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  BOARD_TEMPLATE_KEYS,
  BOARD_TEMPLATE_LABELS,
  type BoardTemplateKey,
} from "@workspace/db/data/board-templates";
import { Button } from "@workspace/ui/components/button";
import { NativeSelect } from "@workspace/ui/components/native-select";

import { getBoardsUrl } from "@/lib/urls";

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
  const [templateKey, setTemplateKey] =
    useState<BoardTemplateKey>("competition");
  const boardsUrl = getBoardsUrl();

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="text-sm font-medium">Tablero AMS</div>
      <p className="text-sm text-muted-foreground">
        Asigna un tablero clonado de una plantilla AMS para organizadores.
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
          <>
            <NativeSelect
              aria-label="Plantilla"
              className="w-auto"
              value={templateKey}
              disabled={pending}
              onChange={(e) =>
                setTemplateKey(e.target.value as BoardTemplateKey)
              }
            >
              {BOARD_TEMPLATE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {BOARD_TEMPLATE_LABELS[key]}
                </option>
              ))}
            </NativeSelect>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await assignBoardToCompetition(
                    competitionId,
                    templateKey,
                  );
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
          </>
        )}
      </div>
    </div>
  );
}
