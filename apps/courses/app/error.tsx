"use client";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <AmsStatusPage
      code="500"
      title="No pudimos completar esta acción"
      description="Revisa los campos e inténtalo de nuevo. Si el problema continúa, contacta al equipo AMS."
    >
      <button
        type="button"
        onClick={reset}
        className={buttonVariants({ variant: "destructive", size: "lg" })}
      >
        Volver a intentar
      </button>
    </AmsStatusPage>
  );
}
