import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { db } from "@workspace/db";
import {
  user,
  session,
  blogStaff,
  blogPosts,
  blogComments,
  courseStaff,
  courses,
  courseEnrollments,
  blogRateLimits,
} from "@workspace/db/schema";
import { and, eq, inArray, like } from "drizzle-orm";
process.loadEnvFile(".env.local");
if (process.env.NODE_ENV === "production") throw new Error("Solo local");
const web = "http://localhost:3000",
  blog = "http://localhost:3004",
  course = "http://localhost:3003",
  suffix = randomUUID();
const ids: string[] = [];
let postId: number | undefined;
let courseId: number | undefined;
function signed(token: string) {
  return `ams.session_token=${encodeURIComponent(`${token}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64")}`)}`;
}
const cookies = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
async function get(url: string, cookie?: string) {
  return fetch(url, {
    headers: cookie ? { Cookie: cookie } : undefined,
    redirect: "manual",
  });
}
async function action(
  url: string,
  html: string,
  fields: Record<string, string>,
  cookie: string,
  match: string,
) {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
    .map((m) => m[0])
    .find((f) => f.includes(match));
  assert(form, "Formulario encontrado");
  const action = form.match(/name="(\$ACTION_ID_[^"]+)"/);
  assert(action, "Acción encontrada");
  const data = new FormData();
  data.set(action[1]!, "");
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return fetch(url, {
    method: "POST",
    headers: { Cookie: cookie, Origin: new URL(url).origin },
    body: data,
    redirect: "manual",
  });
}
try {
  const email = `blog-smoke-${suffix}@example.invalid`;
  const password = `OnlyLocal!${randomUUID()}`;
  const forged = await fetch(`${web}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: web,
      "X-Forwarded-For": "127.0.0.71",
    },
    body: JSON.stringify({
      name: "Lector temporal",
      email,
      password,
      role: "delegate",
      wcaId: "2000FORGED01",
    }),
  });
  assert.equal(
    forged.status,
    400,
    "Registro rechaza campos de identidad falsificados",
  );
  const signup = await fetch(`${web}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: web,
      "X-Forwarded-For": "127.0.0.72",
    },
    body: JSON.stringify({ name: "Lector temporal", email, password }),
  });
  assert.equal(signup.status, 200, "Registro con correo");
  const info = await signup.json();
  ids.push(info.user.id);
  let readerCookie = cookies(signup);
  assert(readerCookie);
  const [reader] = await db
    .select()
    .from(user)
    .where(eq(user.id, info.user.id));
  assert.equal(reader?.role, "user");
  assert.equal(reader?.wcaId, null);
  assert.equal(reader?.emailVerified, false);
  assert.equal((await get(`${blog}/admin`, readerCookie)).status, 307);
  assert.equal((await get(`${course}/admin`, readerCookie)).status, 307);
  const editorId = `blog-editor-${suffix}`,
    teacherId = `blog-teacher-${suffix}`;
  ids.push(editorId, teacherId);
  const editorToken = randomUUID(),
    teacherToken = randomUUID();
  await db.insert(user).values([
    {
      id: editorId,
      name: "Editor temporal",
      email: `editor-${email}`,
      emailVerified: true,
    },
    {
      id: teacherId,
      name: "Instructor temporal",
      email: `teacher-${email}`,
      emailVerified: true,
    },
  ]);
  await db.insert(session).values([
    {
      id: randomUUID(),
      token: editorToken,
      userId: editorId,
      expiresAt: new Date(Date.now() + 600000),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      token: teacherToken,
      userId: teacherId,
      expiresAt: new Date(Date.now() + 600000),
      updatedAt: new Date(),
    },
  ]);
  await db.insert(blogStaff).values({ userId: editorId, role: "editor" });
  await db
    .insert(courseStaff)
    .values({ userId: teacherId, role: "instructor" });
  const editorCookie = signed(editorToken),
    teacherCookie = signed(teacherToken);
  assert.equal((await get(`${blog}/admin`, editorCookie)).status, 200);
  assert.equal((await get(`${course}/admin`, editorCookie)).status, 307);
  assert.equal((await get(`${blog}/admin`, teacherCookie)).status, 307);
  assert.equal((await get(`${course}/admin`, teacherCookie)).status, 200);
  const [post] = await db
    .insert(blogPosts)
    .values({
      slug: `smoke-${suffix}`,
      title: "Entrada temporal",
      status: "published",
      commentsEnabled: true,
      authorId: editorId,
      sections: [
        {
          id: "s",
          background: "white",
          columns: 1,
          blocks: [{ id: "b", type: "text", text: "Una historia temporal" }],
        },
      ],
    })
    .returning();
  postId = post!.id;
  const postUrl = `${blog}/entradas/${post!.slug}`;
  const page = await get(postUrl, editorCookie);
  const html = await page.text();
  let response = await action(
    postUrl,
    html,
    { postId: String(postId), content: "Un comentario temporal" },
    readerCookie,
    'name="postId"',
  );
  assert(response.headers.get("location")?.includes("verifica-correo"));
  const inbox = await get(`${web}/api/cuenta/verificacion-local`, readerCookie);
  assert.equal(inbox.status, 200);
  const mail = await inbox.json();
  assert(mail.url, "Verificación local privada");
  const verified = await get(mail.url, readerCookie);
  assert.equal(verified.status, 302);
  if (cookies(verified)) readerCookie = cookies(verified);
  const [updated] = await db
    .select()
    .from(user)
    .where(eq(user.id, info.user.id));
  assert.equal(updated?.emailVerified, true);
  response = await action(
    postUrl,
    html,
    { postId: String(postId), content: "Un comentario temporal" },
    readerCookie,
    'name="postId"',
  );
  assert.equal(response.status, 303);
  const [comment] = await db
    .select()
    .from(blogComments)
    .where(
      and(
        eq(blogComments.postId, postId!),
        eq(blogComments.authorId, info.user.id),
      ),
    );
  assert.equal(comment?.status, "pending");
  assert(
    !(await (await get(postUrl)).text()).includes("Un comentario temporal"),
  );
  const moderation = await get(`${blog}/admin/comentarios`, editorCookie);
  const moderationHtml = await moderation.text();
  response = await action(
    `${blog}/admin/comentarios`,
    moderationHtml,
    { id: String(comment!.id), status: "approved" },
    editorCookie,
    `value="${comment!.id}"`,
  );
  assert.equal(response.status, 303);
  assert(
    (await (await get(postUrl)).text()).includes("Un comentario temporal"),
  );
  const editUrl = `${blog}/admin/entradas/${postId}`;
  const editHtml = await (await get(editUrl, editorCookie)).text();
  const fields = {
    id: String(postId),
    revision: "1",
    title: "Entrada temporal actualizada",
    slug: post!.slug,
    excerpt: "Resumen temporal",
    status: "draft",
    coverUrl: "",
    categories: "Guías",
    tags: "AMS",
    commentsEnabled: "on",
    sections: JSON.stringify(post!.sections),
  };
  response = await action(
    editUrl,
    editHtml,
    fields,
    readerCookie,
    'name="sections"',
  );
  assert(response.headers.get("location")?.includes("sin-permiso"));
  response = await action(
    editUrl,
    editHtml,
    {
      ...fields,
      sections: JSON.stringify([
        { id: "s", background: "purple", columns: 1, blocks: [] },
      ]),
    },
    editorCookie,
    'name="sections"',
  );
  assert(response.headers.get("location")?.includes("error=bloques"));
  response = await action(
    editUrl,
    editHtml,
    fields,
    editorCookie,
    'name="sections"',
  );
  assert.equal(response.status, 303);
  assert.equal((await get(postUrl)).status, 404);
  response = await action(
    editUrl,
    editHtml,
    fields,
    editorCookie,
    'name="sections"',
  );
  assert(response.headers.get("location")?.includes("error=conflicto"));
  const [learning] = await db
    .insert(courses)
    .values({
      slug: `blog-learning-${suffix}`,
      title: "Curso temporal",
      status: "published",
    })
    .returning();
  courseId = learning!.id;
  const courseUrl = `${course}/cursos/${learning!.slug}`;
  const courseHtml = await (await get(courseUrl, readerCookie)).text();
  response = await action(
    courseUrl,
    courseHtml,
    { courseId: String(courseId) },
    readerCookie,
    'name="courseId"',
  );
  assert.equal(response.status, 303);
  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, courseId!),
        eq(courseEnrollments.userId, info.user.id),
      ),
    );
  assert(enrollment, "Cuenta local puede tomar cursos");
  const blockedUpload = await fetch(`${blog}/api/media`, {
    method: "POST",
    headers: { Cookie: readerCookie, Origin: blog },
    body: new FormData(),
  });
  assert.equal(blockedUpload.status, 403);
  console.log(
    "OK: registro local, verificación privada, aislamiento de permisos, comentarios moderados, borradores privados, marca protegida, concurrencia y cursos sin WCA.",
  );
} finally {
  if (postId) await db.delete(blogPosts).where(eq(blogPosts.id, postId));
  if (courseId) await db.delete(courses).where(eq(courses.id, courseId));
  if (ids.length) {
    await db
      .delete(blogRateLimits)
      .where(like(blogRateLimits.key, `%${suffix}%`));
    await db.delete(user).where(inArray(user.id, ids));
  }
}
process.exit(0);
