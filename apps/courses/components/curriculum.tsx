import Link from "next/link";
import type { courseModules, courseLessons } from "@workspace/db/schema";
import { cn } from "@workspace/ui/lib/utils";

export function Curriculum({
  slug,
  modules,
  lessons,
  completed = [],
  active,
  canRead = false,
  compact = false,
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
  compact?: boolean;
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
        <div className="mt-6" key={module.id ?? "none"}>
          <h3
            className={cn(
              "ams-heading mb-2.5 font-bold",
              compact ? "text-[13px]" : "text-base",
            )}
          >
            {module.title}
          </h3>
          <ul>
            {lessons
              .filter((l) => l.moduleId === module.id)
              .map((lesson) => {
                const isDone = completed.includes(lesson.id);
                const isActive = active === lesson.id;
                return (
                  <li key={lesson.id}>
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      href={
                        canRead
                          ? `/cursos/${slug}/lecciones/${lesson.id}`
                          : `/cursos/${slug}`
                      }
                      className={cn(
                        "flex items-center gap-3 border-b border-ams-navy/5 hover:text-ams-red",
                        compact
                          ? "py-2.5 text-xs leading-relaxed"
                          : "py-3 text-sm",
                        isActive && "font-bold text-ams-red",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 text-[13px]",
                          isDone ? "text-ams-green" : "text-ams-navy/60",
                        )}
                        aria-label={isDone ? "Completada" : "Pendiente"}
                      >
                        {isDone ? "✓" : "○"}
                      </span>
                      <span>{lesson.title}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </>
  );
}
