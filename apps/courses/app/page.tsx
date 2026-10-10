import Link from "next/link";
import { db } from "@workspace/db";
import { courses, courseLessons } from "@workspace/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CourseCard } from "@/components/course-card";
import { Eyebrow, textLinkClass } from "@/components/ui";

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
      <section className="relative overflow-hidden bg-[linear-gradient(90deg,rgba(1,11,25,0.94),rgba(1,11,25,0.78)),url(/source/photos/ponny-1.jpg)] bg-cover bg-center py-12 text-white md:py-18">
        <div className="ams-texture absolute inset-0 opacity-15" />
        <div className="ams-container relative grid max-w-295 items-center gap-15 md:grid-cols-[1.5fr_1fr]">
          <div>
            <Eyebrow className="text-ams-orange">
              Cursos de la comunidad · AMS
            </Eyebrow>
            <h1 className="ams-display mb-6 max-w-172.5 text-[clamp(2.6rem,5.3vw,4.5rem)] leading-[1.03]">
              Aprende hoy.
              <br />
              Haz la diferencia
              <br />
              en la próxima competencia.
            </h1>
            <p className="mb-7 max-w-152.5 text-[15px] leading-[1.8] text-white/75 md:text-[17px]">
              Conviértete en el staff que toda competencia necesita. Aprende con
              la comunidad, a tu ritmo y desde donde estés.
            </p>
            <Button asChild variant="destructive" size="lg">
              <a href="#cursos">
                Explorar cursos <span>↓</span>
              </a>
            </Button>
          </div>
          <div className="hidden md:block">
            <div
              className="mx-auto grid w-55 -rotate-12 grid-cols-3 gap-2.5 opacity-95"
              aria-hidden="true"
            >
              {Array.from({ length: 9 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-16 rounded-[1px]",
                    i % 3 === 2
                      ? "bg-ams-red"
                      : i % 3 === 0
                        ? "bg-ams-green"
                        : "bg-white",
                  )}
                />
              ))}
            </div>
            <div className="mt-7.5 text-center text-[13px] text-white/60">
              Cada pieza cuenta. Tú también.
            </div>
          </div>
        </div>
      </section>
      <div className="ams-container grid max-w-295 gap-5 border-b border-ams-navy/10 py-8 sm:grid-cols-3 sm:gap-7.5">
        {[
          ["01", "A tu ritmo", "Retoma cada lección donde la dejaste."],
          [
            "02",
            "Aprende haciendo",
            "Material práctico y evaluaciones para el staff.",
          ],
          ["03", "Una sola cuenta", "Una cuenta AMS o WCA y todo tu progreso."],
        ].map(([number, title, text]) => (
          <div key={number}>
            <strong className="ams-heading">
              <span className="mr-2.5 text-xs tracking-[2px] text-ams-red">
                {number}
              </span>
              {title}
            </strong>
            <p className="mt-1.5 text-sm leading-[1.7] text-ams-navy/60">
              {text}
            </p>
          </div>
        ))}
      </div>
      <section className="ams-container max-w-295 py-12" id="cursos">
        <div className="mb-7 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>Tu siguiente paso</Eyebrow>
            <h2 className="ams-display text-[clamp(1.8rem,3.5vw,2.4rem)] leading-[1.03]">
              Explora nuestros cursos
            </h2>
            <p className="mt-1.5 text-ams-navy/60">
              Capacitación para apoyar al speedcubing en México.
            </p>
          </div>
          <Link href="/mis-cursos" className={textLinkClass}>
            Mi aprendizaje →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map(({ course, count }) => (
            <CourseCard key={course.id} course={course} count={count} />
          ))}
          {!catalog.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-ams-navy/20 p-10.5 text-center">
              <h2 className="ams-heading text-xl font-bold">
                Estamos preparando nuevos cursos
              </h2>
              <p className="text-ams-navy/60">
                Vuelve pronto para descubrir la capacitación AMS.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
