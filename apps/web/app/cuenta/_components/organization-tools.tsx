import type { AccountAction } from "../_lib/actions-config";
import { ActionCard } from "./action-card";

export function OrganizationTools({ actions }: { actions: AccountAction[] }) {
  return (
    <div className="mb-14">
      <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
        Permisos de organización
      </p>
      <h2 className="ams-display mb-6 text-[clamp(2rem,5vw,3.25rem)] leading-none">
        Herramientas de organización
      </h2>
      <div
        className={`grid gap-6 ${actions.length >= 4 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
      >
        {actions.map((action) => (
          <ActionCard key={action.href} action={action} compact />
        ))}
      </div>
    </div>
  );
}
