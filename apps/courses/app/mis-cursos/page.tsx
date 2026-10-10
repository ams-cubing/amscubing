import { db } from "@workspace/db";
import { courses, courseEnrollments } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { requireViewer } from "@/lib/auth";
import { getCourse, getProgress } from "@/lib/data";
import { Button } from "@workspace/ui/components/button";
import { CourseCard } from "@/components/course-card";
import { Callout, Eyebrow, PageHeading, textLinkClass } from "@/components/ui";
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
    <section className="ams-container max-w-295 py-12">
      <div className="mb-7 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Eyebrow>Mi aprendizaje</Eyebrow>
          <PageHeading>Hola, {viewer.name.split(" ")[0]}.</PageHeading>
          <p className="mt-1.5 text-ams-navy/60">
            Cada lección te acerca a tu próxima competencia.
          </p>
        </div>
        <Link href="/" className={textLinkClass}>
          Explorar cursos →
        </Link>
      </div>
      <Callout>
        Si ya tomaste el curso en el sitio anterior, tu historial se recupera al
        usar el mismo correo verificado en tu cuenta AMS o WCA. Si cambiaste de
        correo, contacta a AMS para vincularlo.
      </Callout>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <CourseCard key={item.course.id} {...item} enrolled />
        ))}
        {!items.length && (
          <div className="col-span-full rounded-2xl border border-dashed border-ams-navy/20 p-10.5 text-center">
            <h2 className="ams-heading text-xl font-bold">
              Tu aprendizaje empieza aquí
            </h2>
            <p className="mb-4 text-ams-navy/60">
              Elige un curso y empieza a aprender con AMS.
            </p>
            <Button asChild variant="destructive">
              <Link href="/">Encontrar mi primer curso</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
