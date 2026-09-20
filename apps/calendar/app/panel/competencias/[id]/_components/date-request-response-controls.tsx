"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import {
  acceptDateRequest,
  declineDateRequest,
} from "../_actions/respond-date-request";

export function DateRequestResponseControls({
  competitionId,
}: {
  competitionId: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
      <div>
        <div className="text-sm font-medium">Propuesta de delegación</div>
        <p className="text-sm text-muted-foreground mt-1">
          Se te propuso como delegado de esta competencia. Confirma o rechaza
          para continuar.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await acceptDateRequest(competitionId);
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success(result.message);
              router.refresh();
            });
          }}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Confirmar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await declineDateRequest(competitionId);
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success(result.message);
              router.refresh();
            });
          }}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          Rechazar
        </Button>
      </div>
    </div>
  );
}
