import { Suspense } from "react";
import { todayInMexico } from "@workspace/db/equipment";

import { requireDelegate } from "@/lib/session";

import { LoanForm } from "../../_components/loan-form";
import {
  getLendableInventory,
  getLoanCompetitionOptions,
} from "../../_lib/queries";
import Loading from "../../loading";

async function PageContent() {
  const session = await requireDelegate();
  const today = todayInMexico();
  const [inventory, competitions] = await Promise.all([
    getLendableInventory(),
    getLoanCompetitionOptions(today),
  ]);

  return (
    <LoanForm
      types={inventory.types}
      items={inventory.items}
      stock={inventory.stock}
      guardians={inventory.guardians}
      competitions={competitions}
      defaultLenderId={session.ok ? session.session.user.id : null}
      today={today}
    />
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Nuevo préstamo</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          El equipo sale del inventario del guardián que presta y quien lo
          recibe recibe una notificación.
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent />
      </Suspense>
    </div>
  );
}
