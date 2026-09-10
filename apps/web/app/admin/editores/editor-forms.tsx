"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  grantEditor,
  revokeEditor,
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

export function GrantEditorForm() {
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
          const next = await grantEditor({
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
        <Label htmlFor="grant-wcaId">WCA ID</Label>
        <Input
          id="grant-wcaId"
          name="wcaId"
          placeholder="2016TORO03"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Otorgando…" : "Otorgar editor"}
      </Button>
      <Feedback result={result} />
    </form>
  );
}

export function RevokeEditorButton({
  wcaId,
  name,
}: {
  wcaId: string;
  name: string;
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
          if (!window.confirm(`¿Revocar el rol editor de ${name}?`)) {
            return;
          }
          startTransition(async () => {
            const next = await revokeEditor({ wcaId });
            setResult(next);
            if (next.ok) router.refresh();
          });
        }}
      >
        {pending ? "…" : "Revocar"}
      </Button>
      <Feedback result={result} />
    </div>
  );
}
