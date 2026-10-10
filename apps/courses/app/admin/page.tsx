import Link from "next/link";
import { db } from "@workspace/db";
import {
  courses,
  courseEnrollments,
  courseLegacyRecords,
  courseLegacyStudents,
} from "@workspace/db/schema";
import { desc, sql } from "drizzle-orm";
import { requireManager } from "@/lib/auth";
import { Button } from "@workspace/ui/components/button";
import { getWebUrl } from "@workspace/auth/urls";
import { canGrantPermission } from "@workspace/auth/permissions";
import { cn } from "@workspace/ui/lib/utils";
import {
  Callout,
  Eyebrow,
  PageHeading,
  Pill,
  panelClass,
  smallClass,
  tdClass,
  textLinkClass,
  thClass,
} from "@/components/ui";

export default async function AdminPage() {
  const viewer = await requireManager();
  const catalog = await db.select().from(courses).orderBy(desc(courses.id));
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter(where completed_at is not null)::int`,
    })
    .from(courseEnrollments);
  const [legacy] = await db
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter(where ${courseLegacyRecords.completedAt} is not null)::int`,
    })
    .from(courseLegacyRecords)
    .where(sql`${courseLegacyRecords.lessonId} is null`);
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(courseLegacyStudents)
    .where(sql`${courseLegacyStudents.claimedBy} is null`);
  return (
    <section className="ams-container max-w-295 py-12">
      <div className="mb-7 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Eyebrow>Equipo AMS</Eyebrow>
          <PageHeading>Administrar cursos</PageHeading>
          <p className="mt-1.5 text-ams-navy/60">
            Crea experiencias de aprendizaje para la comunidad.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canGrantPermission(viewer.role, viewer.staffRole) && (
            <Button asChild variant="outline">
              <a href={`${getWebUrl()}/admin/permisos`}>Gestionar permisos ↗</a>
            </Button>
          )}
          <Button asChild variant="destructive">
            <Link href="/admin/cursos/nuevo">+ Crear curso</Link>
          </Button>
        </div>
      </div>
      <div className="mb-6 grid gap-4.5 sm:grid-cols-3">
        {[
          [catalog.length, "Cursos"],
          [
            (stats?.total ?? 0) + (legacy?.total ?? 0),
            "Inscripciones actuales e históricas",
          ],
          [legacy?.done ?? 0, "Finalizaciones importadas de WordPress"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl bg-white p-5.5">
            <strong className="ams-display block text-[34px]">{value}</strong>
            <span className={smallClass}>{label}</span>
          </div>
        ))}
      </div>
      <div className={cn(panelClass, "overflow-x-auto")}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={thClass}>Curso</th>
              <th className={thClass}>Estado</th>
              <th className={thClass}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((c) => (
              <tr key={c.id}>
                <td className={tdClass}>{c.title}</td>
                <td className={tdClass}>
                  <Pill tone={c.status === "published" ? "success" : "neutral"}>
                    {c.status === "published"
                      ? "Publicado"
                      : c.status === "draft"
                        ? "Borrador"
                        : "Archivado"}
                  </Pill>
                </td>
                <td className={tdClass}>
                  <Link
                    href={`/admin/cursos/${c.id}`}
                    className={textLinkClass}
                  >
                    Editar →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!catalog.length && (
          <p className="mt-4">Aún no hay cursos. Crea el primero.</p>
        )}
      </div>
      <Callout className="mt-8">
        {pending?.count ?? 0} historiales esperan vincularse cuando sus alumnos
        inicien sesión con el mismo correo verificado en AMS o WCA.
      </Callout>
    </section>
  );
}
