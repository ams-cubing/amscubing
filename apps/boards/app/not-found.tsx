import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function NotFound() {
  return (
    <AmsStatusPage
      code="404"
      title="Tablero no encontrado"
      description="No existe o no tienes permiso para verlo."
    >
      <Link
        href="/"
        className={buttonVariants({ variant: "default", size: "lg" })}
      >
        Volver a mis tableros
      </Link>
    </AmsStatusPage>
  );
}
