import Image from "next/image";
import Link from "next/link";
import type { courses } from "@workspace/db/schema";
import { cleanHtml } from "@/lib/content";
import { formatCourseScore, type CourseScore } from "@/lib/course-score";
import { Pill, ProgressBar, smallClass, textLinkClass } from "./ui";

export function CourseCard({
  course,
  count,
  completed,
  enrolled,
  result,
  hasCertificate,
}: {
  course: typeof courses.$inferSelect;
  count: number;
  completed?: number;
  enrolled?: boolean;
  result?: CourseScore;
  hasCertificate?: boolean;
}) {
  const description = cleanHtml(course.description)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 170);
  const isComplete = completed === count && !!count;
  return (
    <article className="ams-slash-card overflow-hidden bg-white">
      <Link
        href={`/cursos/${course.slug}`}
        className="relative flex h-45 items-center justify-center bg-[linear-gradient(90deg,rgba(1,11,25,0.65),rgba(1,11,25,0.2)),url(/source/photos/ponny-1.jpg)] bg-cover bg-center text-white"
        aria-label={course.title}
      >
        {course.coverUrl ? (
          <Image
            src={course.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <span className="ams-display px-6 py-4.5 text-2xl">
            Aprende · Participa
          </span>
        )}
      </Link>
      <div className="p-6.5">
        <Pill tone={isComplete ? "success" : "neutral"}>
          {isComplete ? "Completado" : enrolled ? "En curso" : "Formación AMS"}
        </Pill>
        <h2 className="ams-heading my-3 text-[19px] leading-normal font-bold">
          <Link href={`/cursos/${course.slug}`}>{course.title}</Link>
        </h2>
        <p className="text-sm leading-[1.7] text-ams-navy/60">{description}…</p>
        <div className="my-4.5 flex gap-4 text-[13px] text-ams-navy/60">
          <span>{count} lecciones</span>
          <span>◷ A tu ritmo</span>
        </div>
        {enrolled && (
          <>
            <ProgressBar
              percent={count ? Math.round((100 * (completed ?? 0)) / count) : 0}
            />
            <p className={smallClass}>
              {completed ?? 0} de {count} lecciones completadas
            </p>
          </>
        )}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-ams-navy/10 pt-5">
          <span className={smallClass}>Con tu cuenta AMS o WCA</span>
          <Link className={textLinkClass} href={`/cursos/${course.slug}`}>
            {enrolled ? "Continuar" : "Ver curso"} →
          </Link>
        </div>
        {hasCertificate && result && (
          <div className="mt-5 border-t border-ams-navy/10 pt-4">
            <p className={smallClass}>
              Puntuación: <strong>{formatCourseScore(result)}</strong>
            </p>
            <a
              className={textLinkClass}
              href={`/cursos/${encodeURIComponent(course.slug)}/certificado`}
            >
              Descargar certificado PDF ↓
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
