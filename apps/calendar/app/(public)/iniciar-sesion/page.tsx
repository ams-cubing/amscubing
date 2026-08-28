import { isAllowedReturnTo } from "@workspace/auth/urls";

import { SignInRedirect } from "./_components/sign-in-redirect";

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const callbackURL =
    returnTo && isAllowedReturnTo(returnTo) ? returnTo : "/";

  return <SignInRedirect callbackURL={callbackURL} />;
}
