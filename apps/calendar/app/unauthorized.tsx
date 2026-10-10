import Link from "next/link";

import { AmsSignInLink } from "@workspace/ui/components/ams-sign-in-link";
import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

import { getCalendarUrl, getCrossAppSignInUrl } from "@/lib/urls";

export default function UnauthorizedPage() {
  return (
    <AmsStatusPage
      code="401"
      title="Inicia sesión"
      description="Usa tu cuenta AMS o WCA para continuar. Al entrar volverás a esta página."
    >
      <AmsSignInLink href={getCrossAppSignInUrl(getCalendarUrl())} />
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Volver al calendario
      </Link>
    </AmsStatusPage>
  );
}
