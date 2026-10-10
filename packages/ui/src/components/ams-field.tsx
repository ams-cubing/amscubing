import type { ComponentProps, ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export function AmsField({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("mb-4 block text-sm font-semibold", className)}>
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

export function AmsNotice({
  children,
  tone = "info",
  className,
  ...props
}: ComponentProps<"p"> & { tone?: "info" | "error" }) {
  return (
    <p
      className={cn(
        "mb-6 rounded-2xl border-l-4 px-5 py-4 text-base",
        tone === "error"
          ? "border-ams-red bg-ams-red/5"
          : "border-ams-green bg-ams-green/5",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
