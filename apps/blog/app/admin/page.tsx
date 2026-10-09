import Link from "next/link";
import { db } from "@workspace/db";
import { blogPosts, blogStaff, user, blogComments } from "@workspace/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { requireManager } from "@/lib/auth";
import { grantStaff } from "@/app/actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; permisos?: string }>;
}) {
  const viewer = await requireManager();
  const params = await searchParams;
  const posts = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt))
    .limit(200);
  const [pending] = await db
    .select({ count: count() })
    .from(blogComments)
    .where(eq(blogComments.status, "pending"));
  const staff = viewer.canManageStaff
    ? await db
        .select({ name: user.name, email: user.email, role: blogStaff.role })
        .from(blogStaff)
        .innerJoin(user, eq(blogStaff.userId, user.id))
    : [];
  return (
    <section className="section shell">
      <div className="toolbar">
        <div>
          <span className="eyebrow">GESTIÓN EDITORIAL</span>
          <h1>Blog AMS</h1>
        </div>
        <Link className="button" href="/admin/entradas/nueva">
          Crear entrada
        </Link>
      </div>
      {params.error && (
        <p className="notice">
          {{
            cuenta: "La cuenta debe existir y tener correo verificado.",
            propio:
              "Tu propio permiso se conserva para evitar perder el acceso.",
            permisos: "Tu rol no permite administrar permisos.",
          }[params.error] ?? "Revisa los datos."}
        </p>
      )}
      {params.permisos && (
        <p className="notice">Permisos de Blog actualizados.</p>
      )}
      <div className="toolbar">
        <p>{posts.length} entradas</p>
        <Link className="button secondary" href="/admin/comentarios">
          Moderar comentarios ({pending?.count ?? 0})
        </Link>
      </div>
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Entrada</th>
              <th>Estado</th>
              <th>Autoría</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td className="status">
                  {
                    {
                      draft: "Borrador",
                      published: "Publicada",
                      archived: "Archivada",
                    }[p.status]
                  }
                </td>
                <td>{p.authorName}</td>
                <td>
                  <Link href={`/admin/entradas/${p.id}`}>Editar ↗</Link> ·{" "}
                  <Link href={`/entradas/${p.slug}`}>Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewer.canManageStaff && (
        <div className="panel">
          <h2>Permisos de Blog</h2>
          <p>
            Estos permisos son independientes de Cursos. La cuenta debe estar
            registrada y tener correo verificado.
          </p>
          <form action={grantStaff}>
            <div className="inline-fields">
              <label className="field">
                <span>Correo de la cuenta</span>
                <input type="email" name="email" required />
              </label>
              <label className="field">
                <span>Permiso</span>
                <select name="role">
                  <option value="editor">
                    Editor · entradas y comentarios
                  </option>
                  <option value="administrator">
                    Administrador · incluye permisos
                  </option>
                  <option value="developer">
                    Desarrollador · incluye permisos
                  </option>
                  <option value="none">Retirar permiso de Blog</option>
                </select>
              </label>
            </div>
            <button className="button">Actualizar permiso</button>
          </form>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Permiso</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.email}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
