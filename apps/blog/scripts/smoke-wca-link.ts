import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  user,
  account,
  blogStaff,
  courseStaff,
  blogPosts,
  blogComments,
  courses,
  courseEnrollments,
  verification,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuth } from "@workspace/auth";
process.loadEnvFile(".env.local");
if (process.env.NODE_ENV === "production") throw new Error("Solo desarrollo");
const suffix = randomUUID(),
  base = "http://localhost:3000",
  numeric = String(Date.now()),
  wcaId = `2099TEST${numeric.slice(-2)}`;
const localEmail = `wca-link-${suffix}@example.invalid`,
  wcaEmail = `wca-other-${suffix}@example.invalid`;
let userId: string | undefined,
  postId: number | undefined,
  courseId: number | undefined;
const states: string[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  if (url.includes("/.well-known/openid-configuration"))
    return Response.json({
      authorization_endpoint:
        "https://www.worldcubeassociation.org/oauth/authorize",
      token_endpoint: "https://www.worldcubeassociation.org/oauth/token",
      userinfo_endpoint: "https://www.worldcubeassociation.org/api/v0/me",
    });
  if (url.includes("/oauth/token"))
    return Response.json({
      access_token: "synthetic-local-token",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "public email",
    });
  if (url.includes("/api/v0/me"))
    return Response.json({
      me: {
        id: Number(numeric),
        name: "Persona WCA de prueba",
        email: wcaEmail,
        wca_id: wcaId,
        delegate_status: null,
      },
    });
  throw new Error("La prueba impide cualquier solicitud externa inesperada");
}) as typeof fetch;
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
const auth = createAuth();
async function request(path: string, body?: unknown, cookie?: string) {
  return auth.handler(
    new Request(`${base}/api/auth${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        "X-Forwarded-For": "127.0.0.88",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}
try {
  const signup = await request("/sign-up/email", {
    name: "Cuenta AMS de prueba",
    email: localEmail,
    password: `OnlyLocal!${suffix}`,
  });
  assert.equal(signup.status, 200);
  const data = await signup.json();
  userId = data.user.id;
  const cookie = cookies(signup);
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.id, userId!));
  await db.insert(blogStaff).values({ userId: userId!, role: "editor" });
  await db.insert(courseStaff).values({ userId: userId!, role: "instructor" });
  const [post] = await db
    .insert(blogPosts)
    .values({
      slug: `link-${suffix}`,
      title: "Entrada temporal",
      authorId: userId!,
    })
    .returning();
  postId = post!.id;
  await db.insert(blogComments).values({
    postId: postId!,
    authorId: userId!,
    authorName: "Prueba",
    content: "Historial local",
  });
  const [course] = await db
    .insert(courses)
    .values({ slug: `link-${suffix}`, title: "Curso temporal" })
    .returning();
  courseId = course!.id;
  await db
    .insert(courseEnrollments)
    .values({ courseId: courseId!, userId: userId! });
  const linking = await request(
    "/oauth2/link",
    { providerId: "wca", callbackURL: `${base}/cuenta` },
    cookie,
  );
  assert.equal(linking.status, 200);
  const authorization = await linking.json();
  const state = new URL(authorization.url).searchParams.get("state")!;
  states.push(state);
  const callback = await request(
    `/callback/wca?code=synthetic-code&state=${encodeURIComponent(state)}`,
    undefined,
    `${cookie}; ${cookies(linking)}`,
  );
  assert.equal(callback.status, 302);
  assert.equal(callback.headers.get("location"), `${base}/cuenta`);
  const [member] = await db.select().from(user).where(eq(user.id, userId!));
  assert.equal(member?.wcaId, wcaId);
  assert.equal(member?.email, localEmail);
  const [linked] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId!), eq(account.providerId, "wca")));
  assert.equal(linked?.accountId, numeric);
  const signin = await request("/sign-in/oauth2", {
    providerId: "wca",
    callbackURL: `${base}/cuenta`,
  });
  assert.equal(signin.status, 200);
  const signData = await signin.json();
  const signState = new URL(signData.url).searchParams.get("state")!;
  states.push(signState);
  const signed = await request(
    `/callback/wca?code=synthetic-code&state=${encodeURIComponent(signState)}`,
    undefined,
    cookies(signin),
  );
  assert.equal(signed.status, 302);
  const session = await request("/get-session", undefined, cookies(signed));
  const current = await session.json();
  assert.equal(current.user.id, userId);
  assert.equal(current.user.email, localEmail);
  assert(
    (
      await db
        .select()
        .from(courseEnrollments)
        .where(eq(courseEnrollments.userId, userId!))
    ).length === 1,
  );
  assert(
    (
      await db
        .select()
        .from(blogComments)
        .where(eq(blogComments.authorId, userId!))
    ).length === 1,
  );
  assert(
    (await db.select().from(blogStaff).where(eq(blogStaff.userId, userId!)))
      .length === 1,
  );
  assert(
    (await db.select().from(courseStaff).where(eq(courseStaff.userId, userId!)))
      .length === 1,
  );
  console.log(
    "OK: OAuth WCA simulado verifica vinculación explícita con correo diferente, acceso posterior y conservación de identidad, permisos, comentarios y cursos.",
  );
} finally {
  globalThis.fetch = originalFetch;
  if (postId) await db.delete(blogPosts).where(eq(blogPosts.id, postId));
  if (courseId) await db.delete(courses).where(eq(courses.id, courseId));
  if (userId) await db.delete(user).where(eq(user.id, userId));
  for (const state of states)
    await db.delete(verification).where(eq(verification.identifier, state));
}
process.exit(0);
