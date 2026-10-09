import { auth } from "@/lib/auth";
import { readDevVerification } from "@workspace/auth/mail";
import { headers } from "next/headers";
export async function GET() {
  if (process.env.NODE_ENV === "production")
    return new Response(null, { status: 404 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response(null, { status: 401 });
  return Response.json(
    { url: await readDevVerification(session.user.id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
