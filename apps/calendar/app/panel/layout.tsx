import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { getDelegatePanelBadges } from "@/lib/delegate-panel-badges";
import { PanelSubnav } from "@/app/panel/_components/panel-subnav";

async function PanelGuard({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== "delegate") {
    unauthorized();
  }

  const badges = session.user.wcaId
    ? await getDelegatePanelBadges(session.user.wcaId)
    : { solicitudesFecha: 0, competencias: 0, total: 0 };

  return (
    <>
      <PanelSubnav badges={badges} />
      {children}
    </>
  );
}

function PanelGuardFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="p-6">
      <Suspense fallback={<PanelGuardFallback />}>
        <PanelGuard>{children}</PanelGuard>
      </Suspense>
    </main>
  );
}
