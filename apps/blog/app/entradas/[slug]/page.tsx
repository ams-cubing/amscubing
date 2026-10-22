import Image from "next/image";
import { db } from "@workspace/db";
import { blogPosts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getWebUrl } from "@workspace/auth/urls";
import { AmsField, AmsNotice } from "@workspace/ui/components/ams-field";
import { ActionForm } from "@workspace/ui/components/action-form";
import { AmsSignInLink } from "@workspace/ui/components/ams-sign-in-link";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Tag } from "@/components/tag";
import { getViewer, signInUrl } from "@/lib/auth";
import { Sections } from "@/components/sections";
import { addComment } from "@/app/actions";
import { getApprovedComments, getPublishedPost } from "@/lib/posts";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [viewer, published] = await Promise.all([
    getViewer(),
    getPublishedPost(slug),
  ]);
  const post =
    published ??
    (viewer?.canManage
      ? (await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)))[0]
      : undefined);
  if (!post) notFound();
  const comments = await getApprovedComments(post.id);
  return (
    <>
      <div className="ams-container my-6 max-w-295 text-[13px] text-ams-navy/60">
        <Link href="/">Blog</Link> / {post.categories.join(" · ")}
      </div>
      <header className="bg-ams-navy py-14 text-white">
        <div className="ams-container max-w-240">
          {post.status !== "published" && (
            <AmsNotice className="text-white">
              Vista previa · {post.status}
            </AmsNotice>
          )}
          {post.categories.map((c) => (
            <Tag key={c} className="bg-white/10 text-white">
              {c}
            </Tag>
          ))}
          <h1 className="ams-display mb-6 text-[clamp(2.2rem,4.5vw,4rem)] leading-[1.08]">
            {post.title}
          </h1>
          <div className="mb-4 text-[13px] text-white/60">
            {post.authorName} ·{" "}
            {post.publishedAt?.toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </div>
          <p className="mb-6 max-w-210 text-[21px] text-white/80">
            {post.excerpt}
          </p>
          {viewer?.canManage && (
            <Button asChild variant="outline" className="text-ams-navy">
              <Link prefetch={false} href={`/admin/entradas/${post.id}`}>Editar entrada</Link>
            </Button>
          )}
          {post.coverUrl && (
            <Image
              className="mt-8 block max-h-127.5 w-full rounded-3xl object-cover"
              src={post.coverUrl}
              alt={post.title}
              width={1600}
              height={900}
              priority
            />
          )}
        </div>
      </header>
      <article>
        <Sections sections={post.sections} />
      </article>
      <section className="ams-container max-w-230 py-14">
        {post.tags.length > 0 && (
          <p className="mb-4">
            {post.tags.map((t) => (
              <Tag key={t}>#{t}</Tag>
            ))}
          </p>
        )}
        <h2 className="ams-heading mb-4 text-[clamp(1.3rem,2.6vw,2rem)] font-bold">
          La conversación
        </h2>
        {comments.map((c) => (
          <div className="border-t border-ams-navy/10 py-5.5" key={c.id}>
            <strong>{c.authorName}</strong>{" "}
            <small className="opacity-65">
              {c.createdAt.toLocaleDateString("es-MX")}
            </small>
            <p className="whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
        {!comments.length && (
          <p className="mb-6">
            Sé la primera persona en compartir tu experiencia.
          </p>
        )}
        {post.commentsEnabled && post.status === "published" ? (
          viewer ? (
            viewer.emailVerified ? (
              <ActionForm
                action={addComment}
                className="mt-6 rounded-3xl bg-white p-5 sm:p-8"
              >
                <input type="hidden" name="postId" value={post.id} />
                <AmsField label="Tu comentario">
                  <Textarea
                    name="content"
                    minLength={3}
                    maxLength={2000}
                    required
                    placeholder="Comparte tu experiencia con respeto"
                    className="min-h-28"
                  />
                </AmsField>
                <p className="mb-4 text-[13px] text-ams-navy/60">
                  Los comentarios se revisan antes de publicarse.
                </p>
                <Button variant="destructive">Enviar comentario</Button>
              </ActionForm>
            ) : (
              <AmsNotice>
                <a className="underline" href={`${getWebUrl()}/cuenta`}>
                  Verifica tu correo en tu cuenta ↗
                </a>{" "}
                para participar.
              </AmsNotice>
            )
          ) : (
            <AmsSignInLink
              href={signInUrl(`/entradas/${post.slug}`)}
              label="Iniciar sesión o crear cuenta para comentar"
              size="default"
            />
          )
        ) : (
          <p className="text-[13px] text-ams-navy/60">
            Los comentarios están cerrados para esta entrada.
          </p>
        )}
      </section>
    </>
  );
}
