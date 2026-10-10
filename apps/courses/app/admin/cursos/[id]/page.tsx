import Link from "next/link";
import { db } from "@workspace/db";
import {
  courses,
  courseEnrollments,
  courseProgress,
  courseLessons,
  user,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { getCourse } from "@/lib/data";
import { CourseEditor } from "@/components/course-editor";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Button } from "@workspace/ui/components/button";
import { SearchParamToast } from "@workspace/ui/components/search-param-toast";
import { Suspense } from "react";
import { Input } from "@workspace/ui/components/input";
import { AmsField } from "@workspace/ui/components/ams-field";
import { cn } from "@workspace/ui/lib/utils";
import { Submit } from "@/components/submit";
import {
  PageHeading,
  panelClass,
  smallClass,
  tdClass,
  thClass,
} from "@/components/ui";
import { saveModule } from "@/app/actions";
import { calculateCourseScore, formatCourseScore } from "@/lib/course-score";

const sectionTitleClass = "ams-heading mb-5 text-2xl font-bold";
const detailsClass = "border-b border-ams-navy/10 py-3.5";
const summaryClass = "cursor-pointer font-bold";

export default async function EditCourse({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManager();
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();
  const [base] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, numericId));
  if (!base) notFound();
  const course = await getCourse(base.slug, true);
  const students = await db
    .select({
      name: user.name,
      userId: user.id,
      certificate: courseEnrollments.certificate,
      enrolledAt: courseEnrollments.enrolledAt,
      completedAt: courseEnrollments.completedAt,
    })
    .from(courseEnrollments)
    .innerJoin(user, eq(user.id, courseEnrollments.userId))
    .where(eq(courseEnrollments.courseId, course.id))
    .orderBy(desc(courseEnrollments.enrolledAt));
  const progress = await db
    .select({
      userId: courseProgress.userId,
      lessonId: courseProgress.lessonId,
      score: courseProgress.score,
    })
    .from(courseProgress)
    .innerJoin(courseLessons, eq(courseProgress.lessonId, courseLessons.id))
    .where(eq(courseLessons.courseId, course.id));
  const moduleFields = (title?: string, position?: number) => (
    <div className="grid gap-x-4.5 sm:grid-cols-2">
      <AmsField label="Nombre">
        <Input name="title" required defaultValue={title} />
      </AmsField>
      <AmsField label="Orden">
        <Input
          type="number"
          min={0}
          name="position"
          required
          defaultValue={position}
        />
      </AmsField>
    </div>
  );
  return (
    <section className="ams-container max-w-295 py-12">
      <Suspense fallback={null}>
        <SearchParamToast
          param="aviso"
          messages={{
            guardado: "Curso guardado.",
            "leccion-guardada": "Lección guardada.",
          }}
        />
      </Suspense>
      <div className="mb-6 text-[13px] text-ams-navy/60">
        <Link href="/admin" className="hover:text-ams-red">
          Administrar
        </Link>{" "}
        / {course.title}
      </div>
      <div className="mb-7 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <PageHeading>{course.title}</PageHeading>
        <Button asChild variant="outline">
          <Link href={`/cursos/${course.slug}`}>Vista previa ↗</Link>
        </Button>
      </div>
      <div className="grid gap-5.5">
        <section className={panelClass}>
          <h2 className={sectionTitleClass}>Información del curso</h2>
          <CourseEditor course={course} />
        </section>
        <section className={panelClass}>
          <h2 className={sectionTitleClass}>Módulos</h2>
          {course.modules.map((m) => (
            <details key={m.id} className={detailsClass}>
              <summary className={summaryClass}>
                {m.position + 1}. {m.title}
              </summary>
              <ActionForm action={saveModule} className="pt-4">
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="moduleId" value={m.id} />
                {moduleFields(m.title, m.position)}
                <Submit>Guardar módulo</Submit>
              </ActionForm>
            </details>
          ))}
          <details className={cn(detailsClass, "mt-6")}>
            <summary className={summaryClass}>+ Agregar módulo</summary>
            <ActionForm action={saveModule} className="pt-4">
              <input type="hidden" name="courseId" value={course.id} />
              {moduleFields(undefined, course.modules.length)}
              <Submit>Agregar módulo</Submit>
            </ActionForm>
          </details>
        </section>
        <section className={panelClass}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="ams-heading text-2xl font-bold">Lecciones</h2>
            <Button asChild variant="destructive">
              <Link href={`/admin/cursos/${course.id}/lecciones/nueva`}>
                + Agregar lección
              </Link>
            </Button>
          </div>
          <ul>
            {course.lessons.map((l) => (
              <li key={l.id}>
                <Link
                  className="flex items-center gap-3 border-b border-ams-navy/5 py-3 text-sm hover:text-ams-red"
                  href={`/admin/cursos/${course.id}/lecciones/${l.id}`}
                >
                  <span className="text-ams-navy/60">{l.position + 1}.</span>
                  <span className="flex-1">{l.title}</span>
                  <span className={smallClass}>
                    {l.quiz.length ? `${l.quiz.length} preguntas` : "Lectura"}
                    {l.requiresReview ? " · Revisar" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className={cn(panelClass, "overflow-x-auto")}>
          <h2 className={sectionTitleClass}>Alumnos con cuenta AMS</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Alumno</th>
                <th className={thClass}>Inscripción</th>
                <th className={thClass}>Estado</th>
                <th className={thClass}>Puntuación</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={i}>
                  <td className={tdClass}>{s.name}</td>
                  <td className={tdClass}>
                    {s.enrolledAt.toLocaleDateString("es-MX")}
                  </td>
                  <td className={tdClass}>
                    {s.completedAt ? "Completado" : "En progreso"}
                  </td>
                  <td className={tdClass}>
                    {s.completedAt
                      ? formatCourseScore(
                          s.certificate ??
                            calculateCourseScore(
                              course.lessons,
                              progress.filter((p) => p.userId === s.userId),
                            ),
                        )
                      : "Pendiente"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length && (
            <p className={cn(smallClass, "mt-4")}>
              El historial de WordPress se vinculará cuando cada alumno inicie
              sesión con AMS o WCA.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
