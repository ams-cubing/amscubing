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
import { Submit } from "@/components/submit";
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
    <section className="shell section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Equipo AMS</span>
          <h1>Administrar cursos</h1>
          <p>Crea experiencias de aprendizaje para la comunidad.</p>
        </div>
        <Link className="btn" href="/admin/cursos/nuevo">
          + Crear curso
        </Link>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <strong>{catalog.length}</strong>
          <span>Cursos</span>
        </div>
        <div className="stat">
          <strong>{(stats?.total ?? 0) + (legacy?.total ?? 0)}</strong>
          <span>Inscripciones actuales e históricas</span>
        </div>
        <div className="stat">
          <strong>{legacy?.done ?? 0}</strong>
          <span>Finalizaciones importadas de WordPress</span>
        </div>
      </div>
      <div className="panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Curso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>
                  <span
                    className={`pill ${c.status === "published" ? "success" : ""}`}
                  >
                    {c.status === "published"
                      ? "Publicado"
                      : c.status === "draft"
                        ? "Borrador"
                        : "Archivado"}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/cursos/${c.id}`} className="text-link">
                    Editar →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!catalog.length && <p>Aún no hay cursos. Crea el primero.</p>}
      </div>
      <div className="callout subsection">
        {pending?.count ?? 0} historiales esperan vincularse cuando sus alumnos
        inicien sesión con el mismo correo verificado en AMS o WCA.
      </div>
      {viewer.canManageStaff && (
        <section className="panel subsection">
          <h2>Permisos del equipo</h2>
          <p className="small">
            Los delegados pueden gestionar cursos automáticamente.
            Administradores y desarrolladores pueden además asignar permisos. El
            rol editorial del blog no concede acceso a Cursos.
          </p>
          <ul>
            {staff.map((s) => (
              <li key={s.name}>
                {s.name} · {s.role}
              </li>
            ))}
          </ul>
          <form action={grantStaff}>
            <div className="form-grid">
              <label className="field">
                Correo de la cuenta AMS
                <input type="email" name="email" required />
              </label>
              <label className="field">
                Permiso
                <select name="role">
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
                </select>
              </label>
            </div>
            <Submit>Actualizar permisos</Submit>
          </form>
        </section>
      )}
    </section>
  );
}
