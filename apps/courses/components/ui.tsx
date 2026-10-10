import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export const panelClass = "rounded-3xl bg-white p-5 sm:p-8";
export const smallClass = "text-[13px] leading-relaxed text-ams-navy/60";
export const textLinkClass = "ams-heading text-[11px] font-bold text-ams-red";
export const thClass =
  "border-b border-ams-navy/10 px-3 py-4 text-left text-xs uppercase tracking-wider text-ams-navy/60 whitespace-nowrap";
export const tdClass =
  "border-b border-ams-navy/10 px-3 py-4 whitespace-nowrap";

/** Lesson and course descriptions are stored as HTML, so their elements are styled from the wrapper. */
export const proseClass =
  "ams-copy text-base leading-[1.9] [overflow-wrap:anywhere] [&_a]:text-ams-red [&_a]:underline [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-xl [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_li]:ml-6 [&_ol]:mb-4.5 [&_ol]:list-decimal [&_p]:mb-4.5 [&_table]:block [&_table]:w-full [&_table]:overflow-auto [&_table]:border-collapse [&_td]:border [&_td]:border-ams-navy/10 [&_td]:p-2 [&_th]:border [&_th]:border-ams-navy/10 [&_th]:p-2 [&_ul]:mb-4.5 [&_ul]:list-disc [&_video]:h-auto [&_video]:max-w-full [&_video]:rounded-xl";

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ams-heading mb-3.5 block text-xs font-bold tracking-[0.14em] text-ams-red uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success";
}) {
  return (
    <span
      className={cn(
        "ams-heading inline-block rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase",
        tone === "success"
          ? "bg-ams-green/10 text-ams-green"
          : "bg-ams-navy/5 text-ams-navy",
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-3.5 mb-2 h-1.75 overflow-hidden rounded-full bg-ams-navy/10">
      <span
        className="block h-full bg-ams-red"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function Callout({
  children,
  tone = "info",
  className,
  role,
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error";
  className?: string;
  role?: string;
}) {
  return (
    <div
      role={role}
      className={cn(
        "mb-6 rounded-2xl border px-5.5 py-4.5 text-sm leading-relaxed",
        tone === "success" &&
          "border-ams-green/30 bg-ams-green/5 text-ams-green",
        tone === "error" && "border-ams-red/30 bg-ams-red/5 text-ams-red",
        tone === "info" && "border-ams-navy/10 bg-ams-navy/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "ams-display text-[clamp(2.1rem,4vw,2.6rem)] leading-[1.03]",
        className,
      )}
    >
      {children}
    </h1>
  );
}
