import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { Skeleton } from "@workspace/ui/components/skeleton";

async function PanelGuard({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== "delegate") {
    unauthorized();
  }

  return <>{children}</>;
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
