import Link from "next/link";
import { db } from "@workspace/db";
import { courses, courseEnrollments, user } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { getCourse } from "@/lib/data";
import { CourseEditor } from "@/components/course-editor";
import { Submit } from "@/components/submit";
import { saveModule } from "@/app/actions";

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
      enrolledAt: courseEnrollments.enrolledAt,
      completedAt: courseEnrollments.completedAt,
    })
    .from(courseEnrollments)
    .innerJoin(user, eq(user.id, courseEnrollments.userId))
    .where(eq(courseEnrollments.courseId, course.id))
    .orderBy(desc(courseEnrollments.enrolledAt));
  return (
    <section className="shell section">
      <div className="breadcrumb">
        <Link href="/admin">Administrar</Link> / {course.title}
      </div>
      <div className="section-head">
        <h1>{course.title}</h1>
        <Link className="btn secondary" href={`/cursos/${course.slug}`}>
          Vista previa ↗
        </Link>
      </div>
      <div className="stack">
        <section className="panel">
          <h2>Información del curso</h2>
          <CourseEditor course={course} />
        </section>
        <section className="panel">
          <h2>Módulos</h2>
          {course.modules.map((m) => (
            <details key={m.id}>
              <summary>
                {m.position + 1}. {m.title}
              </summary>
              <form action={saveModule}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="moduleId" value={m.id} />
                <div className="form-grid">
                  <label className="field">
                    Nombre
                    <input name="title" required defaultValue={m.title} />
                  </label>
                  <label className="field">
                    Orden
                    <input
                      type="number"
                      min={0}
                      name="position"
                      required
                      defaultValue={m.position}
                    />
                  </label>
                </div>
                <Submit>Guardar módulo</Submit>
              </form>
            </details>
          ))}
          <details className="subsection">
            <summary>+ Agregar módulo</summary>
            <form action={saveModule}>
              <input type="hidden" name="courseId" value={course.id} />
              <div className="form-grid">
                <label className="field">
                  Nombre
                  <input name="title" required />
                </label>
                <label className="field">
                  Orden
                  <input
                    name="position"
                    type="number"
                    min={0}
                    required
                    defaultValue={course.modules.length}
                  />
                </label>
              </div>
              <Submit>Agregar módulo</Submit>
            </form>
          </details>
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Lecciones</h2>
            <Link
              className="btn"
              href={`/admin/cursos/${course.id}/lecciones/nueva`}
            >
              + Agregar lección
            </Link>
          </div>
          <ul className="curriculum">
            {course.lessons.map((l) => (
              <li key={l.id}>
                <Link
                  className="lesson-row"
                  href={`/admin/cursos/${course.id}/lecciones/${l.id}`}
                >
                  <span>{l.position + 1}.</span>
                  <span>{l.title}</span>
                  <span className="small">
                    {l.quiz.length ? `${l.quiz.length} preguntas` : "Lectura"}
                    {l.requiresReview ? " · Revisar" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel table-wrap">
          <h2>Alumnos con cuenta AMS</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Inscripción</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={i}>
                  <td>{s.name}</td>
                  <td>{s.enrolledAt.toLocaleDateString("es-MX")}</td>
                  <td>{s.completedAt ? "Completado" : "En progreso"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length && (
            <p className="small">
              El historial de WordPress se vinculará cuando cada alumno inicie
              sesión con AMS o WCA.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
