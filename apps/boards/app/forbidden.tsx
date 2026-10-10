import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function ForbiddenPage() {
  return (
    <AmsStatusPage
      code="403"
      title="Sin permiso"
      description="Tu cuenta no tiene acceso a este tablero. Si crees que es un error, pide acceso a un organizador o delegado."
    >
      <Link
        href="/"
        className={buttonVariants({ variant: "destructive", size: "lg" })}
      >
        Volver a mis tableros
      </Link>
    </AmsStatusPage>
  );
}
