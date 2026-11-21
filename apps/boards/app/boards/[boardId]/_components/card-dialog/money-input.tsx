"use client";

import * as React from "react";

import {
  formatMxnInput,
  parseMxnToCents,
} from "@workspace/db/budget-labels";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

export function MoneyInput({
  id,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
  placeholder = "0.00",
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  placeholder?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm"
      >
        $
      </span>
      <Input
        id={id}
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="decimal"
        className="pl-7"
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const cents = parseMxnToCents(value);
          if (cents == null) return;
          onChange(formatMxnInput(cents));
        }}
      />
    </div>
  );
}
