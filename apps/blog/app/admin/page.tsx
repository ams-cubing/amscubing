import Link from "next/link";
import { db } from "@workspace/db";
import { blogPosts, blogComments } from "@workspace/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { getWebUrl } from "@workspace/auth/urls";
import { canGrantPermission } from "@workspace/auth/permissions";
import { Button } from "@workspace/ui/components/button";
import { requireManager } from "@/lib/auth";

const th = "border-b border-ams-navy/10 px-2.5 py-3.5 text-left";
const td = "border-b border-ams-navy/10 px-2.5 py-3.5";

export default async function Page() {
  const viewer = await requireManager();
  const posts = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt))
    .limit(200);
  const [pending] = await db
    .select({ count: count() })
    .from(blogComments)
    .where(eq(blogComments.status, "pending"));
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p>{posts.length} entradas</p>
        <div className="flex flex-wrap gap-3">
          {canGrantPermission(viewer.role, viewer.staffRole) && (
            <Button asChild variant="outline">
              <a href={`${getWebUrl()}/admin/permisos`}>Gestionar permisos ↗</a>
            </Button>
          )}
          <Button asChild variant="brand">
            <Link href="/admin/comentarios">
              Moderar comentarios ({pending?.count ?? 0})
            </Link>
          </Button>
        </div>
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
    </section>
  );
}
