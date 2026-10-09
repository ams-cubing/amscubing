import Link from "next/link";
import { db } from "@workspace/db";
import { courses, courseLessons } from "@workspace/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { CourseCard } from "@/components/course-card";

export default async function Home() {
  const catalog = await db
    .select({
      course: courses,
      count: sql<number>`count(${courseLessons.id})::int`,
    })
    .from(courses)
    .leftJoin(courseLessons, eq(courseLessons.courseId, courses.id))
    .where(eq(courses.status, "published"))
    .groupBy(courses.id)
    .orderBy(asc(courses.id));
  return (
    <>
      <section className="hero">
        <div className="shell hero-inner">
          <div>
            <span className="eyebrow">Cursos de la comunidad · AMS</span>
            <h1>
              Aprende hoy.
              <br />
              Haz la diferencia
              <br />
              en la próxima competencia.
            </h1>
            <p>
              Conviértete en el staff que toda competencia necesita. Aprende con
              la comunidad, a tu ritmo y desde donde estés.
            </p>
            <a href="#cursos" className="btn">
              Explorar cursos <span>↓</span>
            </a>
          </div>
          <div className="hero-art-wrap">
            <div className="hero-art" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} />
              ))}
            </div>
            <div className="hero-note">Cada pieza cuenta. Tú también.</div>
          </div>
        </div>
      </section>
      <div className="shell features">
        <div>
          <strong>
            <span className="number">01</span>A tu ritmo
          </strong>
          <p>Retoma cada lección donde la dejaste.</p>
        </div>
        <div>
          <strong>
            <span className="number">02</span>Aprende haciendo
          </strong>
          <p>Material práctico y evaluaciones para el staff.</p>
        </div>
        <div>
          <strong>
            <span className="number">03</span>Una sola cuenta
          </strong>
          <p>Una cuenta AMS o WCA y todo tu progreso.</p>
        </div>
      </div>
      <section className="shell section" id="cursos">
        <div className="section-head">
          <div>
            <span className="eyebrow">Tu siguiente paso</span>
            <h2>Explora nuestros cursos</h2>
            <p>Capacitación para apoyar al speedcubing en México.</p>
          </div>
          <Link href="/mis-cursos" className="text-link">
            Mi aprendizaje →
          </Link>
        </div>
        <div className="grid">
          {catalog.map(({ course, count }) => (
            <CourseCard key={course.id} course={course} count={count} />
          ))}
          {!catalog.length && (
            <div className="empty">
              <h2>Estamos preparando nuevos cursos</h2>
              <p>Vuelve pronto para descubrir la capacitación AMS.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
