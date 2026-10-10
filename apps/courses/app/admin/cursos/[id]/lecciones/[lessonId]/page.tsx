import Link from "next/link";
import { db } from "@workspace/db";
import { courses } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { getCourse } from "@/lib/data";
import { LessonEditor } from "@/components/lesson-editor";
import { PageHeading, panelClass } from "@/components/ui";

export default async function EditLesson({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  await requireManager();
  const { id, lessonId } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();
  const [base] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, numericId));
  if (!base) notFound();
  const course = await getCourse(base.slug, true);
  const lesson = course.lessons.find((l) => l.id === Number(lessonId));
  if (lessonId !== "nueva" && !lesson) notFound();
  return (
    <section className="ams-container max-w-295 py-12">
      <div className="mb-6 text-[13px] text-ams-navy/60">
        <Link
          href={`/admin/cursos/${course.id}`}
          className="hover:text-ams-red"
        >
          {course.title}
        </Link>{" "}
        / {lesson ? "Editar lección" : "Nueva lección"}
      </div>
      <div className={panelClass}>
        <PageHeading className="mb-6">
          {lesson ? lesson.title : "Agregar lección"}
        </PageHeading>
        <LessonEditor
          courseId={course.id}
          modules={course.modules}
          lesson={lesson}
          position={course.lessons.length}
        />
      </div>
    </section>
  );
}
