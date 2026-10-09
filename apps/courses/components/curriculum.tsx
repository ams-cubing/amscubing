import Link from "next/link";
import type { courseModules, courseLessons } from "@workspace/db/schema";

export function Curriculum({
  slug,
  modules,
  lessons,
  completed = [],
  active,
  canRead = false,
}: {
  slug: string;
  modules: (typeof courseModules.$inferSelect)[];
  lessons: Pick<
    typeof courseLessons.$inferSelect,
    "id" | "title" | "moduleId"
  >[];
  completed?: number[];
  active?: number;
  canRead?: boolean;
}) {
  const groups = [
    ...modules,
    ...(lessons.some((l) => l.moduleId === null)
      ? [{ id: null, title: "Lecciones" }]
      : []),
  ];
  return (
    <>
      {groups.map((module) => (
        <div className="module" key={module.id ?? "none"}>
          <h3 className="module-title">{module.title}</h3>
          <ul className="curriculum">
            {lessons
              .filter((l) => l.moduleId === module.id)
              .map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    aria-current={active === lesson.id ? "page" : undefined}
                    href={
                      canRead
                        ? `/cursos/${slug}/lecciones/${lesson.id}`
                        : `/cursos/${slug}`
                    }
                    className={`lesson-row ${completed.includes(lesson.id) ? "complete" : ""} ${active === lesson.id ? "active" : ""}`}
                  >
                    <span
                      className="status"
                      aria-label={
                        completed.includes(lesson.id)
                          ? "Completada"
                          : "Pendiente"
                      }
                    >
                      {completed.includes(lesson.id) ? "✓" : "○"}
                    </span>
                    <span>{lesson.title}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </>
  );
}
