"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { ActionForm } from "@workspace/ui/components/action-form";
import { Button } from "@workspace/ui/components/button";

import { syncCompetitionFromWcaAction } from "../_actions/sync-from-wca";

export function SyncFromWcaButton({
  competitionId,
}: {
  competitionId: number;
}) {
  const router = useRouter();

  return (
    <ActionForm
      action={syncCompetitionFromWcaAction}
      onSuccess={() => router.refresh()}
    >
      <input type="hidden" name="competitionId" value={competitionId} />
      <Button type="submit" variant="outline" size="sm">
        <RefreshCw className="size-4" />
        Actualizar desde WCA
      </Button>
    </ActionForm>
  );
}
