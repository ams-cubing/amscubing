import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

import { signInUrl } from "@/lib/auth";

export default function UnauthorizedPage() {
  return (
    <AmsStatusPage
      code="401"
      title="Inicia sesión"
      description="Usa tu cuenta AMS o WCA para continuar."
    >
      <a
        href={signInUrl("/")}
        className={buttonVariants({ variant: "destructive", size: "lg" })}
      >
        Iniciar sesión
      </a>
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Volver a el blog
      </Link>
    </AmsStatusPage>
  );
}
