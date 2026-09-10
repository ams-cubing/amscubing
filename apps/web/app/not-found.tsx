import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function NotFoundPage() {
  return (
    <AmsStatusPage
      code="404"
      title="Página no encontrada"
      description="La página que buscas no existe o se movió. Revisa la dirección o vuelve al inicio."
    >
      <Link
        href="/"
        className={buttonVariants({ variant: "default", size: "lg" })}
      >
        Inicio
      </Link>
      <Link
        href="/competencias"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Competencias
      </Link>
    </AmsStatusPage>
  );
}
