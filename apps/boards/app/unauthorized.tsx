import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { Button } from "@workspace/ui/components/button";

import { SignInButton } from "@/components/sign-in-button";
import { auth } from "@/lib/auth";

export default async function UnauthorizedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/");
  }

  return (
    <AmsStatusPage
      code="401"
      title="Inicia sesión"
      description="Usa tu cuenta WCA para acceder a los tableros de organización de competencias AMS."
    >
      <SignInButton />
      <Button variant="outline" size="lg" asChild>
        <a href="/">Volver al inicio</a>
      </Button>
    </AmsStatusPage>
  );
}
