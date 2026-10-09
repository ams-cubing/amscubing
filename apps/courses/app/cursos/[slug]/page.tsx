import Link from "next/link";
import { getViewer, signInUrl } from "@/lib/auth";
import { getCourse, getProgress } from "@/lib/data";
import { cleanHtml } from "@/lib/content";
import { Curriculum } from "@/components/curriculum";
import { Submit } from "@/components/submit";
import { enroll } from "@/app/actions";
import { formatCourseScore } from "@/lib/course-score";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getViewer();
  const course = await getCourse(slug, viewer?.canManage);
  const p = viewer ? await getProgress(course.id, viewer.id) : null;
  const done = p?.enrollment?.completedAt
    ? course.lessons.map((l) => l.id)
    : (p?.progress.map((p) => p.lessonId) ?? []);
  const next =
    course.lessons.find((l) => !done.includes(l.id)) ?? course.lessons[0];
  return (
    <section className="shell section">
      <div className="breadcrumb">
        <Link href="/">Cursos</Link> / {course.title}
      </div>
      <div className="two-col">
        <div className="stack">
          <article className="panel">
            <span className="pill">Formación AMS</span>
            <h1>{course.title}</h1>
            <div
              className="prose course-description"
              dangerouslySetInnerHTML={{
                __html: cleanHtml(course.description),
              }}
            />
          </article>
          <section className="panel">
            <h2>Lo que vas a aprender</h2>
            <p className="small">
              {course.modules.length} módulos · {course.lessons.length}{" "}
              lecciones · A tu ritmo
            </p>
            <Curriculum
              slug={slug}
              modules={course.modules}
              lessons={course.lessons}
              completed={done}
              canRead={!!p?.enrollment || viewer?.canManage}
            />
          </section>
        </div>
        <aside className="panel">
          <h2>
            {p?.enrollment?.completedAt
              ? "¡Curso completado!"
              : p?.enrollment
                ? "Continúa aprendiendo"
                : "Tu próximo paso"}
          </h2>
          <p className="small">
            {p?.enrollment?.completedAt
              ? "Tu capacitación ya forma parte de tu historial AMS."
              : "Accede al material y conserva tu avance con tu cuenta AMS o WCA."}
          </p>
          {p?.enrollment && (
            <>
              <div className="progress">
                <span
                  style={{
                    width: `${course.lessons.length ? (done.length / course.lessons.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="small">
                {done.length} de {course.lessons.length} lecciones completadas
              </p>
            </>
          )}
          {p?.enrollment?.completedAt && (
            <div className="course-result">
              <span className="eyebrow">Puntuación del curso</span>
              <p className="course-score">{formatCourseScore(p.result)}</p>
              <p className="small">
                Promedio de las evaluaciones aprobadas. Las lecturas no cuentan
                para la nota.
              </p>
              <a
                className="btn secondary full-width"
                href={`/cursos/${encodeURIComponent(slug)}/certificado`}
              >
                Descargar certificado PDF ↓
              </a>
            </div>
          )}
          {p?.enrollment && next ? (
            <Link
              className="btn full-width"
              href={`/cursos/${slug}/lecciones/${next.id}`}
            >
              {p.enrollment.completedAt
                ? "Repasar lecciones"
                : "Continuar curso"}{" "}
              →
            </Link>
          ) : viewer && course.status === "published" ? (
            <form action={enroll}>
              <input type="hidden" name="courseId" value={course.id} />
              <Submit className="btn full-width">Tomar curso →</Submit>
            </form>
          ) : !viewer ? (
            <a className="btn full-width" href={signInUrl(`/cursos/${slug}`)}>
              Iniciar sesión o crear cuenta
            </a>
          ) : (
            <p className="small">
              Vista previa: publica el curso para permitir inscripciones.
            </p>
          )}
          <hr />
          <p className="small">
            ✓ Progreso guardado
            <br />✓ Evaluaciones incluidas
            <br />✓ Desde cualquier dispositivo
          </p>
          {viewer?.canManage && (
            <Link href={`/admin/cursos/${course.id}`} className="text-link">
              Editar curso →
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
