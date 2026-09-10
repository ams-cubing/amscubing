import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function UnauthorizedPage() {
  return (
    <AmsStatusPage
      code="401"
      title="No autorizado"
      description="Esta sección es solo para delegados. Inicia sesión con un WCA ID con permisos de delegado para continuar."
    >
      <Link
        href="/cuenta"
        className={buttonVariants({ variant: "default", size: "lg" })}
      >
        Ir a cuenta
      </Link>
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Inicio
      </Link>
    </AmsStatusPage>
  );
}
