import { connection } from "next/server";
import { Suspense } from "react";

import { requireDelegate } from "@/lib/session";

import { GuardianCards } from "../_components/guardian-cards";
import { getGuardians, getInventoryOverview } from "../_lib/queries";
import Loading from "./loading";

async function PageContent() {
  await connection();
  const [session, { guardians: groups }, guardians] = await Promise.all([
    requireDelegate(),
    getInventoryOverview(),
    getGuardians(),
  ]);
  const currentUserId = session.ok ? session.session.user.id : null;
  const ordered = [
    ...groups.filter((group) => group.guardian.id === currentUserId),
    ...groups.filter((group) => group.guardian.id !== currentUserId),
  ];

  return (
    <GuardianCards
      groups={ordered}
      guardians={guardians}
      currentUserId={currentUserId}
    />
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Guardianes</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Qué equipo resguarda cada delegado.
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent />
      </Suspense>
    </div>
  );
}
