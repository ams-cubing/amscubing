import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getCourse, getProgress } from "@/lib/data";
import { cleanHtml } from "@/lib/content";
import { Curriculum } from "@/components/curriculum";
import { Submit } from "@/components/submit";
import { createQuizSession } from "@/lib/quiz-session";
import { completeLesson } from "@/app/actions";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug, id } = await params;
  const viewer = await requireViewer(`/cursos/${slug}/lecciones/${id}`);
  const course = await getCourse(slug, viewer.canManage);
  const lesson = course.lessons.find((l) => l.id === Number(id));
  if (!lesson) notFound();
  const p = await getProgress(course.id, viewer.id);
  const query = await searchParams;
  if (!p.enrollment && !viewer.canManage)
    return (
      <section className="shell section">
        <div className="panel">
          <h1>Inscríbete para empezar</h1>
          <p>El curso guarda tu progreso y tus evaluaciones.</p>
          <Link href={`/cursos/${slug}`} className="btn">
            Ir al curso
          </Link>
        </div>
      </section>
    );
  const done = p.enrollment?.completedAt
    ? course.lessons.map((l) => l.id)
    : p.progress.map((p) => p.lessonId);
  const position = course.lessons.findIndex((l) => l.id === lesson.id);
  const next = course.lessons[position + 1];
  const previous = course.lessons[position - 1];
  const lastScore = p.progress.find((p) => p.lessonId === lesson.id)?.score;
  const quizSession = createQuizSession(
    lesson.quiz,
    lesson.quizQuestionCount,
    lesson.id,
    viewer.id,
  );
  return (
    <section className="shell section">
      <div className="breadcrumb">
        <Link href="/mis-cursos">Mi aprendizaje</Link> /{" "}
        <Link href={`/cursos/${slug}`}>{course.title}</Link>
      </div>
      <div className="lesson-layout">
        <aside className="panel sidebar">
          <h2>{course.title}</h2>
          <p className="small">
            {done.length} / {course.lessons.length} completadas
          </p>
          <Curriculum
            slug={slug}
            modules={course.modules}
            lessons={course.lessons}
            completed={done}
            active={lesson.id}
            canRead
          />
        </aside>
        <article className="panel">
          <span className="eyebrow">
            Lección {position + 1} de {course.lessons.length}
          </span>
          <h1>{lesson.title}</h1>
          {done.includes(lesson.id) && (
            <div className="callout success">
              ✓ Lección completada
              {lastScore !== null && lastScore !== undefined
                ? ` · Calificación: ${lastScore}%`
                : ""}
            </div>
          )}
          {query.reintentar && (
            <div className="callout error" role="status">
              Aún no alcanzas el {lesson.passPercent}% necesario. Revisa el
              material y vuelve a intentarlo.
            </div>
          )}
          {lesson.requiresReview && (
            <div className="callout">
              Esta evaluación está en revisión por el equipo AMS.
            </div>
          )}
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: cleanHtml(lesson.content) }}
          />
          {lesson.videoUrl && (
            <p>
              <a
                className="text-link"
                href={lesson.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver video de la lección ↗
              </a>
            </p>
          )}
          {!lesson.requiresReview && p.enrollment && (
            <form action={completeLesson} className="subsection">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="quizToken" value={quizSession.token} />
              {lesson.quiz.length > 0 && (
                <>
                  <h2>Comprueba lo que aprendiste</h2>
                  <p className="small">
                    Necesitas {lesson.passPercent}% para aprobar. Puedes volver
                    a intentarlo.
                  </p>
                  {quizSession.questions.map((q, i) => (
                    <fieldset key={q.id} className="quiz-question">
                      <legend>
                        {i + 1}. {q.prompt.replace(/<[^>]*>/g, "")}
                      </legend>
                      {q.type === "text" ? (
                        <label className="field">
                          Tu respuesta
                          <input name={`question-${q.id}`} required />
                        </label>
                      ) : (
                        q.options.map((option, j) => (
                          <label className="quiz-option" key={j}>
                            <input
                              type={q.answers.length > 1 ? "checkbox" : "radio"}
                              name={`question-${q.id}`}
                              value={option}
                              required={q.answers.length === 1}
                            />
                            <span>{option}</span>
                          </label>
                        ))
                      )}
                    </fieldset>
                  ))}
                </>
              )}
              <Submit>
                {lesson.quiz.length
                  ? "Enviar evaluación"
                  : done.includes(lesson.id)
                    ? "Guardar y continuar"
                    : "Marcar como completada"}
              </Submit>
            </form>
          )}
          {!p.enrollment && (
            <p className="small">
              Vista previa del equipo AMS. Inscríbete para registrar tu avance.
            </p>
          )}
          <div className="lesson-nav">
            {previous ? (
              <Link
                className="text-link"
                href={`/cursos/${slug}/lecciones/${previous.id}`}
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                className="text-link"
                href={`/cursos/${slug}/lecciones/${next.id}`}
              >
                Siguiente →
              </Link>
            ) : (
              <Link className="text-link" href={`/cursos/${slug}`}>
                Volver al curso →
              </Link>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
