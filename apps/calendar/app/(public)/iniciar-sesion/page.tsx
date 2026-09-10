import { redirect } from "next/navigation";

import {
  getCalendarUrl,
  getCrossAppSignInUrl,
  isAllowedReturnTo,
} from "@/lib/urls";

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const callbackURL =
    returnTo && isAllowedReturnTo(returnTo) ? returnTo : getCalendarUrl();

  redirect(getCrossAppSignInUrl(callbackURL));
}
