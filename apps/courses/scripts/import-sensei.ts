import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "@workspace/db";
import {
  courses,
  courseModules,
  courseLessons,
  courseLegacyStudents,
  courseLegacyRecords,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import {
  convertContent,
  convertQuestion,
  readCsv,
  uniqueRows,
  references,
  parseDate,
  normalizeEmail,
  isCompleted,
} from "../lib/sensei";
import { safeUrl } from "../lib/content";

// No credentials: consume the official Sensei exports downloaded by an admin.
// Run from apps/courses: pnpm import:sensei ../../.codex/migration/sensei
const directory = resolve(process.argv[2] ?? "../../.codex/migration/sensei");
const load = (name: string) =>
  readCsv(readFileSync(resolve(directory, name), "utf8"));
const files = readdirSync(directory);
const mediaMap = files.includes("media-map.json")
  ? (JSON.parse(
      readFileSync(resolve(directory, "media-map.json"), "utf8"),
    ) as Record<string, string>)
  : {};
const localMedia = (value: string) =>
  Object.entries(mediaMap).reduce(
    (html, [source, target]) => html.split(source).join(target),
    value,
  );
const sourceCourses = uniqueRows(
  load(files.find((f) => f.includes("-Courses-"))!),
);
const courseRow = sourceCourses.get("206");
if (!courseRow) throw new Error("Falta el curso publicado AMS 206");
const lessonIds = references(courseRow.Lessons!);
const sourceLessons = uniqueRows(
  load(files.find((f) => f.includes("-Lessons-"))!).filter((r) =>
    lessonIds.includes(Number(r.Id)),
  ),
);
const questionIds = [...sourceLessons.values()].flatMap((r) =>
  references(r.Questions!),
);
const sourceQuestions = uniqueRows(
  load(files.find((f) => f.includes("-Questions-"))!).filter((r) =>
    questionIds.includes(Number(r.Id)),
  ),
);
const students = load("user-overview.csv");
const enrollmentRows = load("capacitacion-de-staff-users-overview.csv");
const reportManifest = JSON.parse(
  readFileSync(resolve(directory, "lesson-reports.json"), "utf8"),
) as { lessonId: number; file: string }[];
if (
  new Set(reportManifest.map((r) => r.lessonId)).size !== lessonIds.length ||
  lessonIds.some((id) => !reportManifest.some((r) => r.lessonId === id))
)
  throw new Error("Faltan reportes por lección");
const nameHeader = Object.keys(students[0]!).find((key) =>
  key.startsWith("Student"),
)!;
const studentNames = new Map<string, string>();
const duplicateNames = new Set<string>();
for (const student of students) {
  const name = student[nameHeader]!.trim();
  if (
    studentNames.has(name) &&
    studentNames.get(name) !== normalizeEmail(student.Email!)
  )
    duplicateNames.add(name);
  studentNames.set(name, normalizeEmail(student.Email!));
}
const unresolved: { lessonId: number; studentName: string; reason: string }[] =
  [];
const summary = {
  courses: 0,
  modules: 0,
  lessons: 0,
  questions: 0,
  students: 0,
  enrollments: 0,
  completedCourses: 0,
  lessonRecords: 0,
  unresolved: 0,
};
await db.transaction(async (tx) => {
  const values = {
    slug: courseRow.Slug!,
    title: courseRow.Course!,
    description: convertContent(localMedia(courseRow.Description!)),
    coverUrl: mediaMap[courseRow.Image!] ?? safeUrl(courseRow.Image! || ""),
    status: "published" as const,
    legacyId: 206,
    sourceUrl: "https://old.amscubing.org/curso/capacitacion-de-staff-ams/",
    updatedAt: new Date(),
  };
  const [course] = await tx
    .insert(courses)
    .values(values)
    .onConflictDoUpdate({ target: courses.legacyId, set: values })
    .returning();
  if (!course) throw new Error("No se creó el curso");
  summary.courses = 1;
  const moduleMap = new Map<string, number>();
  for (const [position, title] of courseRow.Modules!.split(",").entries()) {
    const [existing] = await tx
      .select()
      .from(courseModules)
      .where(
        and(
          eq(courseModules.courseId, course.id),
          eq(courseModules.title, title),
        ),
      );
    const [module] = existing
      ? [existing]
      : await tx
          .insert(courseModules)
          .values({ courseId: course.id, title, position })
          .returning();
    moduleMap.set(title, module!.id);
    summary.modules++;
  }
  const lessonMap = new Map<number, number>();
  for (const [position, legacyId] of lessonIds.entries()) {
    const row = sourceLessons.get(String(legacyId));
    if (!row) throw new Error(`Falta lección ${legacyId}`);
    const quiz = references(row.Questions!).map((id) => {
      const q = sourceQuestions.get(String(id));
      if (!q) throw new Error(`Falta pregunta ${id}`);
      return convertQuestion(q);
    });
    const values = {
      courseId: course.id,
      moduleId: moduleMap.get(row.Module!) ?? null,
      title: row.Lesson!,
      content: convertContent(localMedia(row.Description!)),
      videoUrl: mediaMap[row.Video!] ?? safeUrl(row.Video! || ""),
      position,
      legacyId,
      sourceUrl: `https://old.amscubing.org/?p=${legacyId}`,
      quiz,
      passPercent: Number(row.Passmark) || 80,
      quizQuestionCount: Number(row["Number Of Questions"]) || 0,
      requiresReview: false,
    };
    const [lesson] = await tx
      .insert(courseLessons)
      .values(values)
      .onConflictDoUpdate({ target: courseLessons.legacyId, set: values })
      .returning();
    lessonMap.set(legacyId, lesson!.id);
    summary.lessons++;
    summary.questions += quiz.length;
  }
  const studentMap = new Map<string, number>();
  for (const row of students) {
    const email = normalizeEmail(row.Email!);
    if (!email.includes("@"))
      throw new Error("Un alumno no tiene correo válido");
    const values = {
      legacyUserId: `sensei-email:${email}`,
      email,
      name: row[nameHeader]!,
    };
    const [student] = await tx
      .insert(courseLegacyStudents)
      .values(values)
      .onConflictDoUpdate({
        target: courseLegacyStudents.email,
        set: { name: values.name },
      })
      .returning();
    studentMap.set(email, student!.id);
    summary.students++;
  }
  for (const row of enrollmentRows) {
    const email = normalizeEmail(row.Email!);
    const studentId = studentMap.get(email);
    if (!studentId)
      throw new Error("Inscripción sin identidad correspondiente");
    const complete = isCompleted(row.Estado!);
    const completedAt = complete
      ? parseDate(row["Fecha de terminación"]!)
      : null;
    if (complete && !completedAt)
      throw new Error("Curso completado sin fecha válida");
    const certificateUrl = safeUrl(
      row.Certificate?.match(/href="([^"]+)"/)?.[1] ?? "",
    );
    const values = {
      studentId,
      courseId: course.id,
      lessonId: null,
      sourceKey: `206:course:${studentId}`,
      status: row.Estado!,
      startedAt: parseDate(row["Fecha de inicio"]!),
      completedAt,
      certificateUrl,
    };
    await tx.insert(courseLegacyRecords).values(values).onConflictDoUpdate({
      target: courseLegacyRecords.sourceKey,
      set: values,
    });
    summary.enrollments++;
    if (complete) summary.completedCourses++;
  }
  for (const report of reportManifest) {
    const rows = load(report.file);
    for (const row of rows) {
      const name = row.Student!.trim();
      const email = studentNames.get(name);
      const studentId = email ? studentMap.get(email) : undefined;
      if (!studentId || duplicateNames.has(name)) {
        unresolved.push({
          lessonId: report.lessonId,
          studentName: name,
          reason: duplicateNames.has(name)
            ? "Nombre ambiguo"
            : "Identidad no encontrada",
        });
        continue;
      }
      const complete = isCompleted(row.Estado!);
      const completedAt = complete
        ? parseDate(row["Fecha de terminación"]!)
        : null;
      if (complete && !completedAt)
        throw new Error(
          `Lección ${report.lessonId}: fecha de terminación inválida`,
        );
      const grade = Number.parseFloat(row.Calificación!);
      const values = {
        studentId,
        courseId: course.id,
        lessonId: lessonMap.get(report.lessonId)!,
        sourceKey: `206:lesson:${report.lessonId}:${studentId}`,
        status: row.Estado!,
        startedAt: parseDate(row["Fecha de inicio"]!),
        completedAt,
        score: Number.isFinite(grade) ? Math.round(grade) : null,
      };
      await tx.insert(courseLegacyRecords).values(values).onConflictDoUpdate({
        target: courseLegacyRecords.sourceKey,
        set: values,
      });
      summary.lessonRecords++;
    }
  }
});
summary.unresolved = unresolved.length;
writeFileSync(
  resolve(directory, "import-summary.json"),
  JSON.stringify(summary, null, 2),
);
writeFileSync(
  resolve(directory, "unresolved.json"),
  JSON.stringify(unresolved, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
