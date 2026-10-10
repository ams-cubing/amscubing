import Link from "next/link";
import { db } from "@workspace/db";
import { blogPosts, blogStaff, user, blogComments } from "@workspace/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { AmsField, AmsNotice } from "@workspace/ui/components/ams-field";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { requireManager } from "@/lib/auth";
import { grantStaff } from "@/app/actions";

const th = "border-b border-ams-navy/10 px-2.5 py-3.5 text-left";
const td = "border-b border-ams-navy/10 px-2.5 py-3.5";

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
    <section className="ams-container max-w-295 py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="ams-heading text-xs font-bold text-ams-red">
            GESTIÓN EDITORIAL
          </span>
          <h1 className="ams-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[1.08]">
            Blog AMS
          </h1>
        </div>
        <Button asChild variant="destructive">
          <Link href="/admin/entradas/nueva">Crear entrada</Link>
        </Button>
      </div>
      {params.error && (
        <AmsNotice tone="error">
          {{
            cuenta: "La cuenta debe existir y tener correo verificado.",
            propio:
              "Tu propio permiso se conserva para evitar perder el acceso.",
            permisos: "Tu rol no permite administrar permisos.",
          }[params.error] ?? "Revisa los datos."}
        </AmsNotice>
      )}
      {params.permisos && <AmsNotice>Permisos de Blog actualizados.</AmsNotice>}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p>{posts.length} entradas</p>
        <Button asChild variant="brand">
          <Link href="/admin/comentarios">
            Moderar comentarios ({pending?.count ?? 0})
          </Link>
        </Button>
      </div>
      <div className="mb-6 overflow-auto rounded-3xl bg-white p-5 sm:p-8">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr>
              <th className={th}>Entrada</th>
              <th className={th}>Estado</th>
              <th className={th}>Autoría</th>
              <th className={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td className={td}>{p.title}</td>
                <td className={`${td} text-xs font-bold uppercase`}>
                  {
                    {
                      draft: "Borrador",
                      published: "Publicada",
                      archived: "Archivada",
                    }[p.status]
                  }
                </td>
                <td className={td}>{p.authorName}</td>
                <td className={td}>
                  <Link href={`/admin/entradas/${p.id}`}>Editar ↗</Link> ·{" "}
                  <Link href={`/entradas/${p.slug}`}>Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewer.canManageStaff && (
        <div className="rounded-3xl bg-white p-5 sm:p-8">
          <h2 className="ams-heading mb-2 text-[clamp(1.3rem,2.6vw,2rem)] font-bold">
            Permisos de Blog
          </h2>
          <p className="mb-6">
            Estos permisos son independientes de Cursos. La cuenta debe estar
            registrada y tener correo verificado.
          </p>
          <form action={grantStaff}>
            <div className="grid gap-x-4.5 sm:grid-cols-2">
              <AmsField label="Correo de la cuenta">
                <Input type="email" name="email" required />
              </AmsField>
              <AmsField label="Permiso">
                <NativeSelect name="role">
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
                </NativeSelect>
              </AmsField>
            </div>
            <Button variant="destructive">Actualizar permiso</Button>
          </form>
          <table className="mt-6 w-full border-collapse text-[15px]">
            <thead>
              <tr>
                <th className={th}>Nombre</th>
                <th className={th}>Correo</th>
                <th className={th}>Permiso</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.email}>
                  <td className={td}>{s.name}</td>
                  <td className={td}>{s.email}</td>
                  <td className={td}>{s.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
