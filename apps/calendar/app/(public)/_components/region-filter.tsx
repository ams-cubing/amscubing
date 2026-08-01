"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { Region } from "@workspace/db/schema";
import { Label } from "@workspace/ui/components/label";

export function RegionFilter({
  regions,
  selected,
}: {
  regions: Region[];
  selected?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value === "todo") params.delete("region");
    else params.set("region", value);
    const q = params.toString();
    router.replace(`${pathname}${q ? `?${q}` : ""}`);
  };

  return (
    <div className="bg-card border rounded-lg p-4 md:p-5 shadow-sm">
      <Label
        id="region-filter-label"
        className="text-sm font-semibold mb-2 block"
      >
        Filtrar por región
      </Label>
      <Select value={selected ?? ""} onValueChange={handleChange}>
        <SelectTrigger
          className="w-full max-w-md"
          aria-labelledby="region-filter-label"
        >
          <SelectValue placeholder="Seleccione una región" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">Todo el país</SelectItem>
          {regions.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
