import { AmsPageHero } from "@workspace/ui/components/ams-page-hero";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { PostCard } from "@/components/post-card";
import {
  listCategories,
  listPublishedPosts,
  POSTS_PER_PAGE,
} from "@/lib/posts";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Math.min(1000, Number(params.pagina) || 1));
  const q = (params.q ?? "").slice(0, 100);
  const category = (params.categoria ?? "").slice(0, 100);
  const [posts, categories] = await Promise.all([
    listPublishedPosts({ page, q, category }),
    listCategories(),
  ]);
  return (
    <>
      <AmsPageHero
        eyebrow="Voces de la comunidad"
        title={
          <>
            Más que un cubo.
            <br />
            Historias que nos unen.
          </>
        }
        description="Guías, novedades y experiencias para disfrutar el speedcubing y construir juntos la comunidad de México."
      />
      <section className="ams-container max-w-295 py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="ams-heading text-[clamp(1.3rem,2.6vw,2rem)] font-bold">
            El blog de AMS
          </h2>
          <form className="flex flex-wrap gap-2.5">
            <label className="sr-only" htmlFor="search">
              Buscar entradas
            </label>
            <Input
              id="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar una historia"
              className="w-60 bg-white"
            />
            <label className="sr-only" htmlFor="category">
              Categoría
            </label>
            <NativeSelect
              id="category"
              name="categoria"
              defaultValue={category}
              className="w-auto max-w-60"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
            <Button variant="destructive">Buscar</Button>
          </form>
        </div>
        {posts.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, POSTS_PER_PAGE).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="rounded-3xl bg-white p-9">
            No hay entradas que coincidan con esta búsqueda.
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {page > 1 && (
            <Button asChild variant="brand">
              <a
                href={`/?pagina=${page - 1}&q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(category)}`}
              >
                Anterior
              </a>
            </Button>
          )}
          {posts.length > POSTS_PER_PAGE && (
            <Button asChild variant="destructive">
              <a
                href={`/?pagina=${page + 1}&q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(category)}`}
              >
                Siguiente
              </a>
            </Button>
          )}
        </div>
      </section>
    </>
  );
}
