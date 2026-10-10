import Link from "next/link";
import { getLearner, signInUrl } from "@/lib/auth";
import { getCourse, getProgress } from "@/lib/data";
import { cleanHtml } from "@/lib/content";
import { Curriculum } from "@/components/curriculum";
import { Submit } from "@/components/submit";
import { enroll } from "@/app/actions";
import { formatCourseScore } from "@/lib/course-score";
import { ActionForm } from "@workspace/ui/components/action-form";
import { AmsSignInLink } from "@workspace/ui/components/ams-sign-in-link";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  Eyebrow,
  PageHeading,
  Pill,
  ProgressBar,
  panelClass,
  proseClass,
  smallClass,
  textLinkClass,
} from "@/components/ui";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getLearner();
  const course = await getCourse(slug, viewer?.canManage);
  const p = viewer ? await getProgress(course.id, viewer.id) : null;
  const done = p?.enrollment?.completedAt
    ? course.lessons.map((l) => l.id)
    : (p?.progress.map((p) => p.lessonId) ?? []);
  const next =
    course.lessons.find((l) => !done.includes(l.id)) ?? course.lessons[0];
  return (
    <section className="ams-container max-w-295 py-12">
      <div className="mb-6 text-[13px] text-ams-navy/60">
        <Link href="/" className="hover:text-ams-red">
          Cursos
        </Link>{" "}
        / {course.title}
      </div>
      <div className="grid items-start gap-7.5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5.5">
          <article className={panelClass}>
            <Pill>Formación AMS</Pill>
            <PageHeading className="mt-3 mb-6">{course.title}</PageHeading>
            <div
              className={cn(proseClass, "text-ams-navy/80")}
              dangerouslySetInnerHTML={{
                __html: cleanHtml(course.description),
              }}
            />
          </article>
          <section className={panelClass}>
            <h2 className="ams-heading mb-5 text-2xl font-bold">
              Lo que vas a aprender
            </h2>
            <p className={smallClass}>
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
        <aside className={panelClass}>
          <h2 className="ams-heading mb-5 text-2xl font-bold">
            {p?.enrollment?.completedAt
              ? "¡Curso completado!"
              : p?.enrollment
                ? "Continúa aprendiendo"
                : "Tu próximo paso"}
          </h2>
          <p className={cn(smallClass, "mb-4")}>
            {p?.enrollment?.completedAt
              ? "Tu capacitación ya forma parte de tu historial AMS."
              : "Accede al material y conserva tu avance con tu cuenta AMS o WCA."}
          </p>
          {p?.enrollment && (
            <>
              <ProgressBar
                percent={
                  course.lessons.length
                    ? (done.length / course.lessons.length) * 100
                    : 0
                }
              />
              <p className={cn(smallClass, "mb-4")}>
                {done.length} de {course.lessons.length} lecciones completadas
              </p>
            </>
          )}
          {p?.enrollment?.completedAt && (
            <div className="my-5 border-t border-ams-navy/10 py-4">
              <Eyebrow>Puntuación del curso</Eyebrow>
              <p className="my-2 text-[28px] font-bold text-ams-red">
                {formatCourseScore(p.result)}
              </p>
              <p className={cn(smallClass, "mb-4")}>
                Promedio de las evaluaciones aprobadas. Las lecturas no cuentan
                para la nota.
              </p>
              <Button asChild variant="outline" className="w-full">
                <a href={`/cursos/${encodeURIComponent(slug)}/certificado`}>
                  Descargar certificado PDF ↓
                </a>
              </Button>
            </div>
          )}
          {p?.enrollment && next ? (
            <Button asChild variant="destructive" className="w-full">
              <Link href={`/cursos/${slug}/lecciones/${next.id}`}>
                {p.enrollment.completedAt
                  ? "Repasar lecciones"
                  : "Continuar curso"}{" "}
                →
              </Link>
            </Button>
          ) : viewer && course.status === "published" ? (
            <ActionForm action={enroll}>
              <input type="hidden" name="courseId" value={course.id} />
              <Submit className="w-full">Tomar curso →</Submit>
            </ActionForm>
          ) : !viewer ? (
            <AmsSignInLink
              href={signInUrl(`/cursos/${slug}`)}
              label="Iniciar sesión o crear cuenta"
              size="default"
              className="w-full"
            />
          ) : (
            <p className={smallClass}>
              Vista previa: publica el curso para permitir inscripciones.
            </p>
          )}
          <hr className="my-6 border-ams-navy/10" />
          <p className={cn(smallClass, "mb-4")}>
            ✓ Progreso guardado
            <br />✓ Evaluaciones incluidas
            <br />✓ Desde cualquier dispositivo
          </p>
          {viewer?.canManage && (
            <Link href={`/admin/cursos/${course.id}`} className={textLinkClass}>
              Editar curso →
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
