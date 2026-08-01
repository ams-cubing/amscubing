import { headers } from "next/headers";
import { unauthorized } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    unauthorized();
  }

  return session;
}
