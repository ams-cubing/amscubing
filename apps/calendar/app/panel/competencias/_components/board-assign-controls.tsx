"use client";

import {
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  Replace,
} from "lucide-react";
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

import {
  assignBoardToCompetition,
  switchCompetitionBoardTemplate,
} from "../_actions/assign-board";

export type BoardTemplateState = {
  templateKey: BoardTemplateKey | null;
  hasActivity: boolean;
};

export function BoardAssignControls({
  competitionId,
  boardId,
  isChampionship,
  boardState,
}: {
  competitionId: number;
  boardId: number | null;
  isChampionship: boolean;
  boardState: BoardTemplateState | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const expectedTemplate: BoardTemplateKey = isChampionship
    ? "championship"
    : "competition";
  const [chosenTemplate, setTemplateKey] = useState<BoardTemplateKey | null>(
    null,
  );
  const templateKey = chosenTemplate ?? expectedTemplate;
  const boardsUrl = getBoardsUrl();

  const currentTemplate = boardState?.templateKey ?? null;
  const canSwitch = Boolean(boardId && boardState && !boardState.hasActivity);
  const mismatch = Boolean(boardId && currentTemplate !== expectedTemplate);

  const templateSelect = (
    <NativeSelect
      aria-label="Plantilla"
      className="w-auto"
      value={templateKey}
      disabled={pending}
      onChange={(e) => setTemplateKey(e.target.value as BoardTemplateKey)}
    >
      {BOARD_TEMPLATE_KEYS.map((key) => (
        <option key={key} value={key}>
          {BOARD_TEMPLATE_LABELS[key]}
        </option>
      ))}
    </NativeSelect>
  );

  function run(
    action: () => Promise<{ error?: string; boardId?: number }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="text-sm font-medium">Tablero AMS</div>
      <p className="text-sm text-muted-foreground">
        {boardId
          ? `Plantilla: ${currentTemplate ? BOARD_TEMPLATE_LABELS[currentTemplate] : "personalizada"}.`
          : "Asigna un tablero clonado de una plantilla AMS para organizadores."}
        {mismatch &&
          ` La competencia es ${isChampionship ? "un campeonato" : "una competencia normal"}.`}
      </p>
      <div className="flex flex-wrap gap-2">
        {boardId ? (
          <>
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
            {canSwitch && (
              <>
                {templateSelect}
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || templateKey === currentTemplate}
                  onClick={() =>
                    run(
                      () =>
                        switchCompetitionBoardTemplate(
                          competitionId,
                          templateKey,
                        ),
                      "Plantilla del tablero cambiada",
                    )
                  }
                >
                  {pending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Replace className="size-4" />
                  )}
                  Cambiar plantilla
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            {templateSelect}
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => assignBoardToCompetition(competitionId, templateKey),
                  "Tablero asignado",
                )
              }
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
      {boardId && boardState?.hasActivity && mismatch && (
        <p className="text-xs text-muted-foreground">
          El tablero ya tiene actividad, así que su plantilla no se puede
          cambiar.
        </p>
      )}
    </div>
  );
}
