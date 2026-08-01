import { redirect } from "next/navigation";

import { Button } from "@workspace/ui/components/button";

import { SignInButton } from "@/components/sign-in-button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function UnauthorizedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Inicia sesión para ver tus tableros
      </h1>
      <p className="max-w-md text-muted-foreground">
        Usa tu cuenta WCA para acceder a los tableros de organización de
        competencias AMS.
      </p>
      <SignInButton />
      <Button variant="ghost" asChild>
        <a href="/">Volver al inicio</a>
      </Button>
    </div>
  );
}
