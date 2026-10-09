import { db } from "@workspace/db";
import { blogPosts, blogComments } from "@workspace/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getWebUrl } from "@workspace/auth/urls";
import { getViewer, signInUrl } from "@/lib/auth";
import { Sections } from "@/components/sections";
import { addComment } from "@/app/actions";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));
  return post
    ? {
        title: post.title,
        description: post.excerpt,
        openGraph: {
          title: post.title,
          description: post.excerpt,
          type: "article",
          images: post.coverUrl ? [post.coverUrl] : [],
        },
      }
    : { title: "Vista previa", robots: { index: false, follow: false } };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { slug } = await params;
  const { aviso } = await searchParams;
  const viewer = await getViewer();
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug));
  if (!post || (post.status !== "published" && !viewer?.canManage)) notFound();
  const comments = await db
    .select()
    .from(blogComments)
    .where(
      and(
        eq(blogComments.postId, post.id),
        eq(blogComments.status, "approved"),
      ),
    )
    .orderBy(desc(blogComments.createdAt))
    .limit(200);
  return (
    <>
      <div className="shell breadcrumbs">
        <Link href="/">Blog</Link> / {post.categories.join(" · ")}
      </div>
      <header className="article-header">
        <div className="shell">
          {post.status !== "published" && (
            <p className="notice">Vista previa · {post.status}</p>
          )}
          {post.categories.map((c) => (
            <span className="tag" key={c}>
              {c}
            </span>
          ))}
          <h1>{post.title}</h1>
          <div className="meta">
            {post.authorName} ·{" "}
            {post.publishedAt?.toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </div>
          <p>{post.excerpt}</p>
          {viewer?.canManage && (
            <Link className="button light" href={`/admin/entradas/${post.id}`}>
              Editar entrada
            </Link>
          )}
          {post.coverUrl && (
            <img className="cover" src={post.coverUrl} alt={post.title} />
          )}
        </div>
      </header>
      <article>
        <Sections sections={post.sections} />
      </article>
      <section className="section shell comments">
        {post.tags.length > 0 && (
          <p>
            {post.tags.map((t) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </p>
        )}
        <h2>La conversación</h2>
        {aviso && (
          <p role="status" className="notice">
            {{
              "comentario-enviado":
                "Gracias. Tu comentario se publicará después de revisarlo.",
              "verifica-correo":
                "Verifica tu correo desde tu cuenta para comentar.",
              "demasiados-comentarios":
                "Espera unos minutos antes de enviar otro comentario.",
              "comentarios-cerrados": "La conversación está cerrada.",
              "comentario-invalido": "Escribe entre 3 y 2000 caracteres.",
            }[aviso] ?? "Revisa tu comentario."}
          </p>
        )}
        {comments.map((c) => (
          <div className="comment" key={c.id}>
            <strong>{c.authorName}</strong>{" "}
            <small>{c.createdAt.toLocaleDateString("es-MX")}</small>
            <p>{c.content}</p>
          </div>
        ))}
        {!comments.length && (
          <p>Sé la primera persona en compartir tu experiencia.</p>
        )}
        {post.commentsEnabled && post.status === "published" ? (
          viewer ? (
            viewer.emailVerified ? (
              <form action={addComment} className="panel">
                <input type="hidden" name="postId" value={post.id} />
                <label className="field">
                  <span>Tu comentario</span>
                  <textarea
                    name="content"
                    minLength={3}
                    maxLength={2000}
                    required
                    placeholder="Comparte tu experiencia con respeto"
                  />
                </label>
                <p className="meta">
                  Los comentarios se revisan antes de publicarse.
                </p>
                <button className="button">Enviar comentario</button>
              </form>
            ) : (
              <p className="notice">
                <a href={`${getWebUrl()}/cuenta`}>
                  Verifica tu correo en tu cuenta ↗
                </a>{" "}
                para participar.
              </p>
            )
          ) : (
            <a className="button" href={signInUrl(`/entradas/${post.slug}`)}>
              Iniciar sesión o crear cuenta para comentar
            </a>
          )
        ) : (
          <p className="meta">
            Los comentarios están cerrados para esta entrada.
          </p>
        )}
      </section>
    </>
  );
}
