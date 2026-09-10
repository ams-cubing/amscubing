import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function NotFoundPage() {
  return (
    <AmsStatusPage
      code="404"
      title="Página no encontrada"
      description="Lo sentimos, la página que buscas no existe o ha sido movida."
    >
      <Link
        href="/"
        className={buttonVariants({ variant: "default", size: "lg" })}
      >
        Ir al calendario
      </Link>
    </AmsStatusPage>
  );
}
