import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function UnauthorizedPage() {
  return (
    <AmsStatusPage
      code="401"
      title="No autorizado"
      description="No tienes permiso para acceder a esta página. Inicia sesión para continuar."
    >
      <Link
        href="/iniciar-sesion"
        className={buttonVariants({ variant: "default", size: "lg" })}
      >
        Iniciar sesión
      </Link>
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Ir al calendario
      </Link>
    </AmsStatusPage>
  );
}
