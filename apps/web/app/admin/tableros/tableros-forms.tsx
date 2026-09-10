"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  addBoardsOrganizer,
  removeBoardsOrganizer,
  type AdminActionResult,
} from "@/app/admin/actions";

function Feedback({ result }: { result: AdminActionResult | null }) {
  if (!result) return null;
  return (
    <p
      className={`ams-copy text-sm ${
        result.ok ? "text-ams-green" : "text-ams-red"
      }`}
      role="status"
    >
      {result.message}
    </p>
  );
}

export function AddBoardsOrganizerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult | null>(null);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const formEl = event.currentTarget;
        const form = new FormData(formEl);
        startTransition(async () => {
          const next = await addBoardsOrganizer({
            wcaId: String(form.get("wcaId") ?? ""),
          });
          setResult(next);
          if (next.ok) {
            formEl.reset();
            router.refresh();
          }
        });
      }}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="boards-wcaId">WCA ID</Label>
        <Input
          id="boards-wcaId"
          name="wcaId"
          placeholder="2016TORO03"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando…" : "Agregar"}
      </Button>
      <Feedback result={result} />
    </form>
  );
}

export function RemoveBoardsOrganizerButton({
  wcaId,
  label,
}: {
  wcaId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(`¿Quitar a ${label} de la allowlist de Tableros?`)
          ) {
            return;
          }
          startTransition(async () => {
            const next = await removeBoardsOrganizer({ wcaId });
            setResult(next);
            if (next.ok) router.refresh();
          });
        }}
      >
        {pending ? "…" : "Quitar"}
      </Button>
      <Feedback result={result} />
    </div>
  );
}
