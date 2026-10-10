import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { AmsField } from "@workspace/ui/components/ams-field";
import { cn } from "@workspace/ui/lib/utils";
import { requireViewer } from "@/lib/auth";
import { getCourse, getProgress } from "@/lib/data";
import { cleanHtml } from "@/lib/content";
import { Curriculum } from "@/components/curriculum";
import { Submit } from "@/components/submit";
import {
  Callout,
  Eyebrow,
  PageHeading,
  panelClass,
  proseClass,
  smallClass,
  textLinkClass,
} from "@/components/ui";
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
      <section className="ams-container max-w-295 py-12">
        <div className={panelClass}>
          <PageHeading className="mb-4">Inscríbete para empezar</PageHeading>
          <p className="mb-5">
            El curso guarda tu progreso y tus evaluaciones.
          </p>
          <Button asChild variant="destructive">
            <Link href={`/cursos/${slug}`}>Ir al curso</Link>
          </Button>
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
    <section className="ams-container max-w-295 py-12">
      <div className="mb-6 text-[13px] text-ams-navy/60">
        <Link href="/mis-cursos" className="hover:text-ams-red">
          Mi aprendizaje
        </Link>{" "}
        /{" "}
        <Link href={`/cursos/${slug}`} className="hover:text-ams-red">
          {course.title}
        </Link>
      </div>
      <div className="grid items-start gap-7.5 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside
          className={cn(
            panelClass,
            "lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto",
          )}
        >
          <h2 className="ams-heading text-lg font-bold">{course.title}</h2>
          <p className={smallClass}>
            {done.length} / {course.lessons.length} completadas
          </p>
          <Curriculum
            slug={slug}
            modules={course.modules}
            lessons={course.lessons}
            completed={done}
            active={lesson.id}
            canRead
            compact
          />
        </aside>
        <article className={panelClass}>
          <Eyebrow>
            Lección {position + 1} de {course.lessons.length}
          </Eyebrow>
          <PageHeading className="mb-6">{lesson.title}</PageHeading>
          {done.includes(lesson.id) && (
            <Callout tone="success">
              ✓ Lección completada
              {lastScore !== null && lastScore !== undefined
                ? ` · Calificación: ${lastScore}%`
                : ""}
            </Callout>
          )}
          {query.reintentar && (
            <Callout tone="error" role="status">
              Aún no alcanzas el {lesson.passPercent}% necesario. Revisa el
              material y vuelve a intentarlo.
            </Callout>
          )}
          {lesson.requiresReview && (
            <Callout>
              Esta evaluación está en revisión por el equipo AMS.
            </Callout>
          )}
          <div
            className={proseClass}
            dangerouslySetInnerHTML={{ __html: cleanHtml(lesson.content) }}
          />
          {lesson.videoUrl && (
            <p className="mt-4">
              <a
                className={textLinkClass}
                href={lesson.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver video de la lección ↗
              </a>
            </p>
          )}
          {!lesson.requiresReview && p.enrollment && (
            <form
              action={completeLesson}
              className="mt-8 border-t border-ams-navy/10 pt-7"
            >
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="quizToken" value={quizSession.token} />
              {lesson.quiz.length > 0 && (
                <>
                  <h2 className="ams-heading mb-2 text-2xl font-bold">
                    Comprueba lo que aprendiste
                  </h2>
                  <p className={cn(smallClass, "mb-5")}>
                    Necesitas {lesson.passPercent}% para aprobar. Puedes volver
                    a intentarlo.
                  </p>
                  {quizSession.questions.map((q, i) => (
                    <fieldset
                      key={q.id}
                      className="mb-4.5 rounded-2xl border border-ams-navy/10 p-5"
                    >
                      <legend className="px-1.5 font-bold">
                        {i + 1}. {q.prompt.replace(/<[^>]*>/g, "")}
                      </legend>
                      {q.type === "text" ? (
                        <AmsField label="Tu respuesta" className="mb-0">
                          <Input name={`question-${q.id}`} required />
                        </AmsField>
                      ) : (
                        q.options.map((option, j) => (
                          <label
                            className="flex cursor-pointer items-start gap-2.5 py-2"
                            key={j}
                          >
                            <input
                              type={q.answers.length > 1 ? "checkbox" : "radio"}
                              name={`question-${q.id}`}
                              value={option}
                              required={q.answers.length === 1}
                              className="mt-0.5 size-4.5 shrink-0 accent-ams-red"
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
            <p className={cn(smallClass, "mt-6")}>
              Vista previa del equipo AMS. Inscríbete para registrar tu avance.
            </p>
          )}
          <div className="mt-8 flex justify-between gap-4 border-t border-ams-navy/10 pt-5">
            {previous ? (
              <Link
                className={textLinkClass}
                href={`/cursos/${slug}/lecciones/${previous.id}`}
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                className={textLinkClass}
                href={`/cursos/${slug}/lecciones/${next.id}`}
              >
                Siguiente →
              </Link>
            ) : (
              <Link className={textLinkClass} href={`/cursos/${slug}`}>
                Volver al curso →
              </Link>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
