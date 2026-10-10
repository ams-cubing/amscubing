import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

import { ReturnSignInLink } from "@/components/return-sign-in-link";

export default function UnauthorizedPage() {
  return (
    <AmsStatusPage
      code="401"
      title="No autorizado"
      description="Inicia sesión para continuar. Al entrar volverás a esta página."
    >
      <ReturnSignInLink />
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Ir al calendario
      </Link>
    </AmsStatusPage>
  );
}
