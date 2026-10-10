import { randomUUID, createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import {
  user,
  session,
  courseStaff,
  courses,
  courseLessons,
  courseEnrollments,
  courseProgress,
  courseQuizAttempts,
  courseLegacyStudents,
  courseLegacyRecords,
} from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { claimLegacyProgress } from "../lib/legacy";

process.loadEnvFile(".env.local");
const base = "http://localhost:3003";
if (process.env.NODE_ENV === "production")
  throw new Error("Solo ejecutar en desarrollo local");
const suffix = randomUUID();
const managerId = `course-test-manager-${suffix}`;
const studentId = `course-test-student-${suffix}`;
const email = `course-test-${suffix}@example.invalid`;
const ids: number[] = [];
function cookie(token: string) {
  return `ams.session_token=${encodeURIComponent(token + "." + createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64"))}`;
}
async function get(path: string, token?: string) {
  return fetch(base + path, {
    headers: token ? { Cookie: cookie(token) } : undefined,
    redirect: "manual",
  });
}
function hiddenFields(form: string) {
  const decode = (value: string) =>
    value
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  return [...form.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)].flatMap(
    ([tag]) => {
      const name = tag.match(/name="([^"]*)"/)?.[1];
      if (!name) return [];
      const field: [string, string] = [
        decode(name),
        decode(tag.match(/value="([^"]*)"/)?.[1] ?? ""),
      ];
      return [field];
    },
  );
}
async function pageStatus(response: Response) {
  if (response.status !== 200) return response.status;
  const html = await response.text();
  const redirect = html.match(/NEXT_REDIRECT;[^;]*;[^;]*;(\d+)/)?.[1];
  const fallback = html.match(/NEXT_HTTP_ERROR_FALLBACK;(\d+)/)?.[1];
  return Number(redirect ?? fallback ?? 200);
}
async function submit(
  path: string,
  html: string,
  fields: Record<string, string | string[]>,
  token: string,
  match?: string,
) {
  const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(
    (m) => m[0],
  );
  const form = forms.find((f) => !match || f.includes(match));
  assert(form, "Formulario no encontrado");
  const hidden = hiddenFields(form);
  assert(
    hidden.some(([name]) => name.startsWith("$ACTION")),
    "Acción de servidor no encontrada",
  );
  const data = new FormData();
  for (const [key, value] of hidden) data.append(key, value);
  for (const [key, value] of Object.entries(fields)) {
    data.delete(key);
    for (const entry of Array.isArray(value) ? value : [value])
      data.append(key, entry);
  }
  return fetch(base + path, {
    method: "POST",
    headers: { Cookie: cookie(token), Origin: base },
    body: data,
    redirect: "manual",
  });
}
const managerToken = randomUUID(),
  studentToken = randomUUID();
try {
  await db.insert(user).values([
    {
      id: managerId,
      name: "Prueba Cursos Manager",
      email: `manager-${email}`,
      emailVerified: true,
    },
    {
      id: studentId,
      name: "Prueba Cursos Student",
      email,
      emailVerified: true,
    },
  ]);
  await db.insert(session).values([
    {
      id: randomUUID(),
      token: managerToken,
      userId: managerId,
      expiresAt: new Date(Date.now() + 600000),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      token: studentToken,
      userId: studentId,
      expiresAt: new Date(Date.now() + 600000),
      updatedAt: new Date(),
    },
  ]);
  await db.insert(courseStaff).values({ userId: managerId, role: "developer" });
  const [course] = await db
    .insert(courses)
    .values({
      slug: `test-course-${suffix}`,
      title: "Curso de prueba temporal",
      description: "Solo verificación",
      status: "published",
      createdBy: managerId,
    })
    .returning();
  ids.push(course!.id);
  const [draft] = await db
    .insert(courses)
    .values({
      slug: `test-draft-${suffix}`,
      title: "Borrador de prueba",
      description: "Privado",
      status: "draft",
    })
    .returning();
  ids.push(draft!.id);
  const [lesson] = await db
    .insert(courseLessons)
    .values({
      courseId: course!.id,
      title: "Lectura de prueba",
      content: "<p>Material</p>",
      position: 0,
    })
    .returning();
  const [quiz] = await db
    .insert(courseLessons)
    .values({
      courseId: course!.id,
      title: "Evaluación de prueba",
      position: 1,
      quiz: [
        {
          id: "test",
          prompt: "Elige A",
          type: "choice",
          options: ["A", "B"],
          answers: ["A"],
          points: 1,
        },
      ],
      passPercent: 80,
      quizQuestionCount: 1,
    })
    .returning();
  assert.equal((await get("/")).status, 200);
  assert.equal(await pageStatus(await get(`/cursos/${draft!.slug}`)), 404);
  assert.equal(await pageStatus(await get("/mis-cursos")), 307);
  const denied = await get("/admin", studentToken);
  assert.equal(await pageStatus(denied), 403);
  const admin = await get("/admin", managerToken);
  assert.equal(admin.status, 200);
  assert((await admin.text()).includes("Administrar cursos"));
  const edit = await get("/admin/cursos/nuevo", managerToken);
  const editHtml = await edit.text();
  const forbidden = await submit(
    "/admin/cursos/nuevo",
    editHtml,
    {
      title: "No autorizado",
      slug: `forbidden-${suffix}`,
      description: "X",
      status: "published",
    },
    studentToken,
  );
  assert.equal(forbidden.status, 403);
  assert.equal(
    (
      await db
        .select()
        .from(courses)
        .where(eq(courses.slug, `forbidden-${suffix}`))
    ).length,
    0,
  );
  const catalog = await get(`/cursos/${course!.slug}`, studentToken);
  const catalogHtml = await catalog.text();
  const enroll = await submit(
    `/cursos/${course!.slug}`,
    catalogHtml,
    { courseId: String(course!.id) },
    studentToken,
    "courseId",
  );
  assert.equal(enroll.status, 303);
  const invalidEnroll = await submit(
    `/cursos/${course!.slug}`,
    catalogHtml,
    { courseId: String(draft!.id) },
    studentToken,
    "courseId",
  );
  assert.equal(invalidEnroll.status, 200);
  assert.equal(
    (
      await db
        .select()
        .from(courseEnrollments)
        .where(eq(courseEnrollments.courseId, draft!.id))
    ).length,
    0,
  );
  const path = `/cursos/${course!.slug}/lecciones/${lesson!.id}`;
  const read = await get(path, studentToken);
  const complete = await submit(
    path,
    await read.text(),
    { lessonId: String(lesson!.id) },
    studentToken,
    "lessonId",
  );
  assert.equal(complete.status, 303);
  assert.equal(
    (
      await db
        .select()
        .from(courseProgress)
        .where(
          and(
            eq(courseProgress.userId, studentId),
            eq(courseProgress.lessonId, lesson!.id),
          ),
        )
    ).length,
    1,
  );
  const quizPath = `/cursos/${course!.slug}/lecciones/${quiz!.id}`;
  const quizHtml = await (await get(quizPath, studentToken)).text();
  const quizToken = quizHtml.match(/name="quizToken" value="([^"]+)"/)?.[1];
  assert(quizToken);
  const tampered = await submit(
    quizPath,
    quizHtml,
    {
      lessonId: String(quiz!.id),
      quizToken: quizToken + "x",
      "question-test": "A",
    },
    studentToken,
    "lessonId",
  );
  assert.equal(tampered.status, 200);
  const failed = await submit(
    quizPath,
    quizHtml,
    { lessonId: String(quiz!.id), quizToken, "question-test": "B" },
    studentToken,
    "lessonId",
  );
  assert.equal(failed.status, 303);
  assert.equal(
    (
      await db
        .select()
        .from(courseProgress)
        .where(eq(courseProgress.lessonId, quiz!.id))
    ).length,
    0,
  );
  const passed = await submit(
    quizPath,
    quizHtml,
    { lessonId: String(quiz!.id), quizToken, "question-test": "A" },
    studentToken,
    "lessonId",
  );
  assert.equal(passed.status, 303);
  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, course!.id),
        eq(courseEnrollments.userId, studentId),
      ),
    );
  assert(enrollment?.completedAt);
  assert.equal(enrollment.certificate?.score, 100);
  assert.equal(enrollment.certificate?.name, "Prueba Cursos Student");
  const certificatePath = `/cursos/${course!.slug}/certificado`;
  const downloaded = await get(certificatePath, studentToken);
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.headers.get("content-type"), "application/pdf");
  assert.equal(downloaded.headers.get("cache-control"), "private, no-store");
  assert.equal(
    Buffer.from(await downloaded.arrayBuffer())
      .subarray(0, 5)
      .toString(),
    "%PDF-",
  );
  assert.equal((await get(certificatePath)).status, 401);
  assert.equal((await get(certificatePath, managerToken)).status, 403);
  const downloadedAgain = await get(certificatePath, studentToken);
  assert.equal(
    downloadedAgain.headers.get("content-disposition"),
    downloaded.headers.get("content-disposition"),
  );
  const completedPage = await (
    await get(`/cursos/${course!.slug}`, studentToken)
  ).text();
  assert(completedPage.includes("100/100"));
  assert(completedPage.includes("Descargar certificado PDF"));
  assert.equal(
    (
      await db
        .select()
        .from(courseQuizAttempts)
        .where(eq(courseQuizAttempts.userId, studentId))
    ).length,
    2,
  );
  const [legacy] = await db
    .insert(courseLegacyStudents)
    .values({
      legacyUserId: `test-${suffix}`,
      email,
      name: "Historial temporal",
    })
    .returning();
  await db.insert(courseLegacyRecords).values({
    studentId: legacy!.id,
    courseId: course!.id,
    lessonId: null,
    sourceKey: `test-${suffix}`,
    status: "Completado",
    completedAt: new Date(),
  });
  await claimLegacyProgress({ id: studentId, email, emailVerified: false });
  let [staged] = await db
    .select()
    .from(courseLegacyStudents)
    .where(eq(courseLegacyStudents.id, legacy!.id));
  assert.equal(staged!.claimedBy, null);
  await claimLegacyProgress({ id: studentId, email, emailVerified: true });
  await claimLegacyProgress({ id: studentId, email, emailVerified: true });
  [staged] = await db
    .select()
    .from(courseLegacyStudents)
    .where(eq(courseLegacyStudents.id, legacy!.id));
  assert.equal(staged!.claimedBy, studentId);
  assert.equal(
    (
      await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.courseId, course!.id),
            eq(courseEnrollments.userId, studentId),
          ),
        )
    ).length,
    1,
  );
  console.log(
    "Smoke local: catálogo, privacidad de borradores, permisos, inscripciones, lectura, evaluaciones, finalización y vinculación verificada OK.",
  );
} finally {
  await db
    .delete(courseLegacyStudents)
    .where(eq(courseLegacyStudents.legacyUserId, `test-${suffix}`));
  if (ids.length) await db.delete(courses).where(inArray(courses.id, ids));
  await db.delete(user).where(inArray(user.id, [managerId, studentId]));
}
process.exit(0);
