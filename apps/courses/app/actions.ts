"use server";
import { db } from "@workspace/db";
import {
  courses,
  courseLessons,
  courseModules,
  courseEnrollments,
  courseProgress,
  courseQuizAttempts,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ActionError,
  runAction,
  type ActionResult,
} from "@workspace/server/action";
import { requireViewer, requireManager } from "@/lib/auth";
import { cleanHtml, safeUrl } from "@/lib/content";
import { gradeQuiz } from "@/lib/grading";
import {
  notifyCourseCompleted,
  notifyCoursePublished,
} from "@/lib/notifications";
import { verifyQuizSession } from "@/lib/quiz-session";

const id = (data: FormData, field: string) =>
  z.coerce.number().int().positive().parse(data.get(field));
const text = (data: FormData, field: string, max = 200) =>
  z.string().trim().min(1).max(max).parse(data.get(field));
const questionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1).max(5000),
    type: z.enum(["choice", "boolean", "text"]),
    options: z.array(z.string().min(1).max(2000)).max(30),
    answers: z.array(z.string().min(1).max(2000)).min(1).max(30),
    points: z.number().int().min(1).max(100),
  })
  .superRefine((q, ctx) => {
    if (
      q.type !== "text" &&
      (!q.options.length || q.answers.some((a) => !q.options.includes(a)))
    )
      ctx.addIssue({
        code: "custom",
        message: "Las respuestas deben existir en las opciones",
      });
  });

export async function saveCourse(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(() => saveCourseData(data));
}

async function saveCourseData(data: FormData) {
  const viewer = await requireManager();
  const values = {
    title: text(data, "title"),
    slug: text(data, "slug").toLowerCase(),
    description: cleanHtml(text(data, "description", 100000)),
    coverUrl: safeUrl(String(data.get("coverUrl") ?? "")),
    status: z
      .enum(["draft", "published", "archived"])
      .parse(data.get("status")),
    updatedAt: new Date(),
  };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug))
    throw new ActionError(
      "El enlace solo admite letras minúsculas, números y guiones",
    );
  let courseId: number;
  let wasPublished = false;
  if (data.get("courseId")) {
    courseId = id(data, "courseId");
    const [existing] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId));
    if (!existing) throw new ActionError("El curso ya no existe.");
    wasPublished = existing.status === "published";
    try {
      await db.update(courses).set(values).where(eq(courses.id, courseId));
    } catch {
      throw new ActionError("Ese enlace ya lo usa otro curso.");
    }
  } else {
    let created;
    try {
      [created] = await db
        .insert(courses)
        .values({ ...values, createdBy: viewer.id })
        .returning();
    } catch {
      throw new ActionError("Ese enlace ya lo usa otro curso.");
    }
    courseId = created!.id;
  }
  if (values.status === "published" && !wasPublished)
    await notifyCoursePublished({
      course: { id: courseId, slug: values.slug, title: values.title },
      actorId: viewer.id,
    });
  revalidatePath("/", "layout");
  redirect(`/admin/cursos/${courseId}?aviso=guardado`);
}

export async function saveModule(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(() => saveModuleData(data));
}

async function saveModuleData(data: FormData): Promise<ActionResult> {
  await requireManager();
  const courseId = id(data, "courseId");
  const values = {
    courseId,
    title: text(data, "title"),
    position: z.coerce.number().int().min(0).parse(data.get("position")),
  };
  if (data.get("moduleId"))
    await db
      .update(courseModules)
      .set(values)
      .where(
        and(
          eq(courseModules.id, id(data, "moduleId")),
          eq(courseModules.courseId, courseId),
        ),
      );
  else await db.insert(courseModules).values(values);
  revalidatePath("/", "layout");
  return { ok: true, message: "Módulo guardado." };
}

export async function saveLesson(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(() => saveLessonData(data));
}

async function saveLessonData(data: FormData) {
  await requireManager();
  const courseId = id(data, "courseId");
  const moduleId = data.get("moduleId") ? id(data, "moduleId") : null;
  if (moduleId) {
    const [module] = await db
      .select()
      .from(courseModules)
      .where(
        and(
          eq(courseModules.id, moduleId),
          eq(courseModules.courseId, courseId),
        ),
      );
    if (!module) throw new ActionError("Elige un módulo de este curso.");
  }
  const quiz = z
    .array(questionSchema)
    .max(100)
    .parse(JSON.parse(String(data.get("quiz") || "[]")));
  if (new Set(quiz.map((q) => q.id)).size !== quiz.length)
    throw new ActionError("Las preguntas deben tener identificadores únicos.");
  const values = {
    courseId,
    moduleId,
    title: text(data, "title"),
    content: cleanHtml(String(data.get("content") ?? "").slice(0, 250000)),
    videoUrl: safeUrl(String(data.get("videoUrl") ?? "")),
    position: z.coerce.number().int().min(0).parse(data.get("position")),
    quiz,
    passPercent: z.coerce
      .number()
      .int()
      .min(0)
      .max(100)
      .parse(data.get("passPercent")),
    quizQuestionCount: z.coerce
      .number()
      .int()
      .min(0)
      .max(100)
      .parse(data.get("quizQuestionCount")),
    requiresReview: false,
  };
  if (data.get("lessonId"))
    await db
      .update(courseLessons)
      .set(values)
      .where(
        and(
          eq(courseLessons.id, id(data, "lessonId")),
          eq(courseLessons.courseId, courseId),
        ),
      );
  else await db.insert(courseLessons).values(values);
  revalidatePath("/", "layout");
  redirect(`/admin/cursos/${courseId}?aviso=leccion-guardada`);
}

export async function enroll(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(() => enrollData(data));
}

async function enrollData(data: FormData) {
  const viewer = await requireViewer();
  const courseId = id(data, "courseId");
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.status, "published")));
  if (!course) throw new ActionError("Este curso ya no está disponible.");
  await db
    .insert(courseEnrollments)
    .values({ courseId, userId: viewer.id })
    .onConflictDoNothing();
  revalidatePath("/", "layout");
  redirect(`/cursos/${course.slug}`);
}

export async function completeLesson(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(() => completeLessonData(data));
}

async function completeLessonData(data: FormData) {
  const viewer = await requireViewer();
  const lessonId = id(data, "lessonId");
  const [row] = await db
    .select({ lesson: courseLessons, course: courses })
    .from(courseLessons)
    .innerJoin(courses, eq(courses.id, courseLessons.courseId))
    .where(
      and(eq(courseLessons.id, lessonId), eq(courses.status, "published")),
    );
  if (!row || row.lesson.requiresReview)
    throw new ActionError("Esta lección ya no está disponible.");
  const { lesson, course } = row;
  let score: number | null = null;
  let passed = true;
  let justCompleted = false;
  await db.transaction(async (tx) => {
    const [enrollment] = await tx
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, course.id),
          eq(courseEnrollments.userId, viewer.id),
        ),
      )
      .for("update");
    if (!enrollment)
      throw new ActionError("Inscríbete al curso antes de guardar progreso.");
    if (lesson.quiz.length) {
      let selected;
      try {
        selected = verifyQuizSession(
          String(data.get("quizToken") ?? ""),
          lesson.quiz,
          lesson.quizQuestionCount,
          lessonId,
          viewer.id,
        );
      } catch {
        throw new ActionError(
          "La evaluación cambió o expiró. Recarga la lección e inténtalo de nuevo.",
        );
      }
      const answers: Record<string, string[]> = Object.fromEntries(
        selected.map((q) => [
          q.id,
          data.getAll(`question-${q.id}`).map(String),
        ]),
      );
      score = gradeQuiz(selected, answers);
      passed = score >= lesson.passPercent;
      await tx
        .insert(courseQuizAttempts)
        .values({ lessonId, userId: viewer.id, answers, score, passed });
    }
    if (passed) {
      await tx
        .insert(courseProgress)
        .values({ lessonId, userId: viewer.id, score })
        .onConflictDoNothing();
      const completed = await tx.execute(
        sql`update course_enrollment set completed_at = now() where course_id = ${course.id} and user_id = ${viewer.id} and completed_at is null and not exists (select 1 from course_lesson l where l.course_id = ${course.id} and not exists (select 1 from course_progress p where p.lesson_id = l.id and p.user_id = ${viewer.id})) returning course_id`,
      );
      justCompleted = completed.length > 0;
    }
  });
  if (justCompleted)
    await notifyCourseCompleted({ course, recipientId: viewer.id });
  if (passed) {
    const { issueCertificate } = await import("@/lib/certificates");
    await issueCertificate(course.id, viewer.id);
  }
  revalidatePath("/", "layout");
  redirect(
    `/cursos/${course.slug}/lecciones/${lesson.id}?${passed ? "completada=1" : "reintentar=1"}${score !== null ? `&nota=${score}` : ""}`,
  );
}
