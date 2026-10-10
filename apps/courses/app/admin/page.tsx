import Link from "next/link";
import { db } from "@workspace/db";
import {
  courses,
  courseEnrollments,
  courseLegacyRecords,
  courseLegacyStudents,
  courseStaff,
  user,
} from "@workspace/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireManager } from "@/lib/auth";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { AmsField } from "@workspace/ui/components/ams-field";
import { cn } from "@workspace/ui/lib/utils";
import { Submit } from "@/components/submit";
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
import { grantStaff } from "@/app/actions";

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
  const staff = viewer.canManageStaff
    ? await db
        .select({ name: user.name, role: courseStaff.role })
        .from(courseStaff)
        .innerJoin(user, eq(user.id, courseStaff.userId))
    : [];
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
        <Button asChild variant="destructive">
          <Link href="/admin/cursos/nuevo">+ Crear curso</Link>
        </Button>
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
      {viewer.canManageStaff && (
        <section className={cn(panelClass, "mt-8")}>
          <h2 className="ams-heading mb-3 text-2xl font-bold">
            Permisos del equipo
          </h2>
          <p className={cn(smallClass, "mb-4")}>
            Los delegados pueden gestionar cursos automáticamente.
            Administradores y desarrolladores pueden además asignar permisos. El
            rol editorial del blog no concede acceso a Cursos.
          </p>
          <ul className="mb-5 list-disc pl-6">
            {staff.map((s) => (
              <li key={s.name}>
                {s.name} · {s.role}
              </li>
            ))}
          </ul>
          <form action={grantStaff}>
            <div className="grid gap-x-4.5 sm:grid-cols-2">
              <AmsField label="Correo de la cuenta AMS">
                <Input type="email" name="email" required />
              </AmsField>
              <AmsField label="Permiso">
                <NativeSelect name="role">
                  <option value="instructor">
                    Instructor: gestionar cursos
                  </option>
                  <option value="administrator">
                    Administrador: gestionar cursos y permisos
                  </option>
                  <option value="developer">
                    Desarrollador: gestionar cursos y permisos
                  </option>
                  <option value="none">
                    Retirar permiso específico de Cursos
                  </option>
                </NativeSelect>
              </AmsField>
            </div>
            <Submit>Actualizar permisos</Submit>
          </form>
        </section>
      )}
    </section>
  );
}
