import type { ReactNode } from "react";

import { AmsPageHero } from "@workspace/ui/components/ams-page-hero";

export function PublicPageShell({
  eyebrow = "Calendario AMS",
  title,
  description,
  width = "wide",
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  width?: "wide" | "narrow" | "medium";
  children: ReactNode;
}) {
  const maxWidth =
    width === "narrow" ? "max-w-3xl" : width === "medium" ? "max-w-4xl" : "";

  return (
    <main className="flex-1">
      <AmsPageHero
        compact
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <section className="bg-white py-10 md:py-14">
        <div className={`ams-container ${maxWidth} space-y-6 md:space-y-8`}>
          {children}
        </div>
      </section>
    </main>
  );
}

export function BrandCallout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "danger";
  children: ReactNode;
}) {
  const border =
    tone === "danger"
      ? "border-ams-red"
      : tone === "warning"
        ? "border-ams-orange"
        : "border-ams-green";

  return (
    <div
      className={`ams-copy rounded-2xl border-l-4 ${border} bg-ams-soft p-4 text-sm font-medium text-ams-navy md:p-5 md:text-base`}
    >
      {children}
    </div>
  );
}
