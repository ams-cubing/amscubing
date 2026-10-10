import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function ForbiddenPage() {
  return (
    <AmsStatusPage
      code="403"
      title="Sin permiso"
      description="Tu cuenta no tiene permiso para gestionar el blog. Si crees que es un error, pide acceso a un delegado o administrador."
    >
      <Link
        href="/"
        className={buttonVariants({ variant: "destructive", size: "lg" })}
      >
        Volver a el blog
      </Link>
    </AmsStatusPage>
  );
}
