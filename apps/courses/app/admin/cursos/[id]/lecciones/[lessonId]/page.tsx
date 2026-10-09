import Link from "next/link";
import { db } from "@workspace/db";
import { courses } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { getCourse } from "@/lib/data";
import { LessonEditor } from "@/components/lesson-editor";

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
    <section className="shell section">
      <div className="breadcrumb">
        <Link href={`/admin/cursos/${course.id}`}>{course.title}</Link> /{" "}
        {lesson ? "Editar lección" : "Nueva lección"}
      </div>
      <div className="panel">
        <h1>{lesson ? lesson.title : "Agregar lección"}</h1>
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
