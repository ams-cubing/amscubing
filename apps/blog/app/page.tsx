import { db } from "@workspace/db";
import { blogPosts } from "@workspace/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { PostCard } from "@/components/post-card";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    pagina?: string;
    aviso?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Math.min(1000, Number(params.pagina) || 1));
  const q = (params.q ?? "").slice(0, 100);
  const category = (params.categoria ?? "").slice(0, 100);
  const conditions = and(
    eq(blogPosts.status, "published"),
    q
      ? or(ilike(blogPosts.title, `%${q}%`), ilike(blogPosts.excerpt, `%${q}%`))
      : undefined,
    category
      ? sql`${blogPosts.categories} @> ${JSON.stringify([category])}::jsonb`
      : undefined,
  );
  const posts = await db
    .select()
    .from(blogPosts)
    .where(conditions)
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
    .limit(13)
    .offset((page - 1) * 12);
  const all = await db
    .select({ categories: blogPosts.categories })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"));
  const categories = [...new Set(all.flatMap((p) => p.categories))].sort();
  return (
    <>
      <header className="hero">
        <div className="shell">
          <span className="eyebrow">VOCES DE LA COMUNIDAD</span>
          <h1>
            Más que un cubo.
            <br />
            Historias que nos unen.
          </h1>
          <p>
            Guías, novedades y experiencias para disfrutar el speedcubing y
            construir juntos la comunidad de México.
          </p>
        </div>
      </header>
      <section className="section shell">
        {params.aviso === "sin-permiso" && (
          <p className="notice">
            Tu cuenta no tiene permiso de gestión de Blog.
          </p>
        )}
        <div className="toolbar">
          <h2>El blog de AMS</h2>
          <form className="filter-form">
            <label className="sr-only" htmlFor="search">
              Buscar entradas
            </label>
            <input
              id="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar una historia"
            />
            <label className="sr-only" htmlFor="category">
              Categoría
            </label>
            <select id="category" name="categoria" defaultValue={category}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button className="button">Buscar</button>
          </form>
        </div>
        {posts.length ? (
          <div className="cards">
            {posts.slice(0, 12).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="empty">
            No hay entradas que coincidan con esta búsqueda.
          </p>
        )}
        <div className="toolbar" style={{ marginTop: 30 }}>
          {page > 1 && (
            <a
              href={`/?pagina=${page - 1}&q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(category)}`}
              className="button secondary"
            >
              Anterior
            </a>
          )}
          {posts.length > 12 && (
            <a
              href={`/?pagina=${page + 1}&q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(category)}`}
              className="button"
            >
              Siguiente
            </a>
          )}
        </div>
      </section>
    </>
  );
}
