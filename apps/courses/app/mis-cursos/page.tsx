import { db } from "@workspace/db";
import { courses, courseEnrollments } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { requireViewer } from "@/lib/auth";
import { getCourse, getProgress } from "@/lib/data";
import { CourseCard } from "@/components/course-card";
import Link from "next/link";

export default async function MyCourses() {
  const viewer = await requireViewer();
  const enrollments = await db
    .select({ course: courses, enrollment: courseEnrollments })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .where(
      and(
        eq(courseEnrollments.userId, viewer.id),
        eq(courses.status, "published"),
      ),
    );
  const items = await Promise.all(
    enrollments.map(async ({ course, enrollment }) => {
      const data = await getCourse(course.slug);
      const p = await getProgress(course.id, viewer.id);
      return {
        course,
        result: p.result,
        hasCertificate: !!enrollment.completedAt,
        count: data.lessons.length,
        completed: enrollment.completedAt
          ? data.lessons.length
          : p.progress.length,
      };
    }),
  );
  return (
    <section className="shell section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Mi aprendizaje</span>
          <h1>Hola, {viewer.name.split(" ")[0]}.</h1>
          <p>Cada lección te acerca a tu próxima competencia.</p>
        </div>
        <Link href="/" className="text-link">
          Explorar cursos →
        </Link>
      </div>
      <div className="callout">
        Si ya tomaste el curso en el sitio anterior, tu historial se recupera al
        usar el mismo correo verificado en tu cuenta AMS o WCA. Si cambiaste de
        correo, contacta a AMS para vincularlo.
      </div>
      <div className="grid">
        {items.map((item) => (
          <CourseCard key={item.course.id} {...item} enrolled />
        ))}
        {!items.length && (
          <div className="empty">
            <h2>Tu aprendizaje empieza aquí</h2>
            <p>Elige un curso y empieza a aprender con AMS.</p>
            <Link href="/" className="btn">
              Encontrar mi primer curso
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
