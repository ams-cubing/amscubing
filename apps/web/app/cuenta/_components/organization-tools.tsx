import { delegateActions, editorActions } from "../_lib/actions-config";
import { ActionCard } from "./action-card";

export function OrganizationTools({ isDelegate }: { isDelegate: boolean }) {
  return (
    <div className="mt-14">
      <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
        Permisos de organización
      </p>
      <h2 className="ams-display mb-6 text-[clamp(2rem,5vw,3.25rem)] leading-none">
        Herramientas para delegados y editores
      </h2>
      {isDelegate ? (
        <div className="grid gap-6 lg:grid-cols-4">
          {delegateActions.map((action) => (
            <ActionCard key={action.title} action={action} compact />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {editorActions.map((action) => (
            <ActionCard key={action.title} action={action} compact />
          ))}
        </div>
      )}
    </div>
  );
}
