import type { ReactNode } from "react";
import type { AmsNavItemLabel } from "@workspace/ui/components/ams-site-nav";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { SiteNav } from "@/components/site-nav";

export function PageSkeleton({
  active,
  children,
}: {
  active?: AmsNavItemLabel;
  children: ReactNode;
}) {
  return (
    <main aria-busy="true">
      <SiteNav active={active} />
      <section className="bg-ams-navy py-20 md:py-24">
        <div className="ams-container space-y-4">
          <Skeleton className="h-4 w-32 bg-white/15" />
          <Skeleton className="h-14 w-full max-w-2xl bg-white/15" />
          <Skeleton className="h-5 w-full max-w-xl bg-white/10" />
        </div>
      </section>
      <section className="bg-white py-16 md:py-20">
        <div className="ams-container">{children}</div>
      </section>
    </main>
  );
}
