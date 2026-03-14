import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";

async function PanelGuard({ children }: { children: React.ReactNode }) {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (session?.user.role !== "delegate") {
    unauthorized();
  }

  return <>{children}</>;
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="p-6">
      <Suspense>
        <PanelGuard>{children}</PanelGuard>
      </Suspense>
    </main>
  );
}
