import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ams-heading mr-1.5 mb-2.5 inline-block rounded-full bg-ams-red/5 px-2.5 py-1.5 text-[11px] font-semibold text-ams-red",
        className,
      )}
    >
      {children}
    </span>
  );
}
