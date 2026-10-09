import Link from "next/link";
import type { courses } from "@workspace/db/schema";
import { cleanHtml } from "@/lib/content";

export function CourseCard({
  course,
  count,
  completed,
  enrolled,
}: {
  course: typeof courses.$inferSelect;
  count: number;
  completed?: number;
  enrolled?: boolean;
}) {
  const description = cleanHtml(course.description)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 170);
  return (
    <article className="card">
      <Link
        href={`/cursos/${course.slug}`}
        className="card-cover"
        aria-label={course.title}
      >
        {course.coverUrl ? (
          <img src={course.coverUrl} alt="" />
        ) : (
          <span className="cover-text">Aprende · Participa</span>
        )}
      </Link>
      <div className="card-body">
        <span
          className={`pill ${completed === count && count ? "success" : ""}`}
        >
          {completed === count && count
            ? "Completado"
            : enrolled
              ? "En curso"
              : "Formación AMS"}
        </span>
        <h2>
          <Link href={`/cursos/${course.slug}`}>{course.title}</Link>
        </h2>
        <p>{description}…</p>
        <div className="meta">
          <span>{count} lecciones</span>
          <span>◷ A tu ritmo</span>
        </div>
        {enrolled && (
          <>
            <div className="progress">
              <span
                style={{
                  width: `${count ? Math.round((100 * (completed ?? 0)) / count) : 0}%`,
                }}
              />
            </div>
            <p className="small">
              {completed ?? 0} de {count} lecciones completadas
            </p>
          </>
        )}
        <div className="card-bottom">
          <span className="small">Con tu cuenta AMS o WCA</span>
          <Link className="text-link" href={`/cursos/${course.slug}`}>
            {enrolled ? "Continuar" : "Ver curso"} →
          </Link>
        </div>
      </div>
    </article>
  );
}
