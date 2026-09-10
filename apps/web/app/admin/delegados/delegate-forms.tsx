"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  addDelegate,
  removeDelegate,
  updateDelegateProfile,
  type AdminActionResult,
} from "@/app/admin/actions";

export type AdminDelegateRow = {
  wcaId: string;
  name: string;
  email: string;
  title: string;
  location: string;
  regionId: string;
};

export type RegionOption = {
  id: string;
  displayName: string;
};

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

export function DelegateEditForm({
  delegate,
  regions,
}: {
  delegate: AdminDelegateRow;
  regions: RegionOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult | null>(null);

  return (
    <form
      className="grid gap-3 border-t border-black/10 pt-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const next = await updateDelegateProfile({
            wcaId: delegate.wcaId,
            title: String(form.get("title") ?? ""),
            location: String(form.get("location") ?? ""),
            regionId: String(form.get("regionId") ?? ""),
          });
          setResult(next);
          if (next.ok) router.refresh();
        });
      }}
    >
      <div className="space-y-1.5 md:col-span-2">
        <p className="ams-heading text-sm font-bold text-ams-navy">
          {delegate.name}
        </p>
        <p className="ams-copy text-xs text-black/50">{delegate.wcaId}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`title-${delegate.wcaId}`}>Título</Label>
        <Input
          id={`title-${delegate.wcaId}`}
          name="title"
          defaultValue={delegate.title}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`location-${delegate.wcaId}`}>Ubicación</Label>
        <Input
          id={`location-${delegate.wcaId}`}
          name="location"
          defaultValue={delegate.location}
          required
        />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor={`region-${delegate.wcaId}`}>Región</Label>
        <select
          id={`region-${delegate.wcaId}`}
          name="regionId"
          defaultValue={delegate.regionId}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          required
        >
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                `¿Quitar a ${delegate.name} del listado público de delegados?`,
              )
            ) {
              return;
            }
            startTransition(async () => {
              const next = await removeDelegate({ wcaId: delegate.wcaId });
              setResult(next);
              if (next.ok) router.refresh();
            });
          }}
        >
          Quitar delegado
        </Button>
        <Feedback result={result} />
      </div>
    </form>
  );
}

export function AddDelegateForm({ regions }: { regions: RegionOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult | null>(null);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formEl = event.currentTarget;
        const form = new FormData(formEl);
        startTransition(async () => {
          const next = await addDelegate({
            wcaId: String(form.get("wcaId") ?? ""),
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            title: String(form.get("title") ?? ""),
            location: String(form.get("location") ?? ""),
            regionId: String(form.get("regionId") ?? ""),
          });
          setResult(next);
          if (next.ok) {
            formEl.reset();
            router.refresh();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="add-wcaId">WCA ID</Label>
        <Input
          id="add-wcaId"
          name="wcaId"
          placeholder="2016TORO03"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-name">Nombre</Label>
        <Input id="add-name" name="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-email">Correo</Label>
        <Input id="add-email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-title">Título</Label>
        <Input
          id="add-title"
          name="title"
          placeholder="Delegado Junior"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-location">Ubicación</Label>
        <Input
          id="add-location"
          name="location"
          placeholder="Nayarit — Occidente"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-region">Región</Label>
        <select
          id="add-region"
          name="regionId"
          defaultValue={regions[0]?.id}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          required
        >
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Agregando…" : "Agregar delegado"}
        </Button>
        <Feedback result={result} />
      </div>
    </form>
  );
}
