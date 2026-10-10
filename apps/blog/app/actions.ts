"use server";
import { db } from "@workspace/db";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { blogPosts, blogComments } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ActionError,
  runAction,
  type ActionResult,
} from "@workspace/server/action";
import { requireManager, requireViewer } from "@/lib/auth";
import {
  notifyCommentModerated,
  notifyCommentPending,
} from "@/lib/notifications";
import { validateSections, safeUrl, slugify, plainText } from "@/lib/content";
const postSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(150),
  excerpt: z.string().max(1000),
  status: z.enum(["draft", "published", "archived"]),
  coverUrl: z.string().max(2000),
  categories: z.string().max(500),
  tags: z.string().max(500),
});
const saveErrors = {
  datos: "Revisa el título, enlace y portada.",
  bloques:
    "Revisa los bloques y sus URLs. Solo se permiten opciones de marca AMS.",
  slug: "Ese enlace ya existe o no se pudo guardar.",
  conflicto:
    "Otra persona modificó la entrada. Recarga para obtener la versión actual antes de guardar.",
};
export async function savePost(
  _state: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const viewer = await requireManager();
    const id = Number(form.get("id"));
    const revision = Number(form.get("revision"));
    const parsed = postSchema.safeParse({
      title: form.get("title"),
      slug: form.get("slug") || slugify(String(form.get("title"))),
      excerpt: form.get("excerpt") ?? "",
      status: form.get("status"),
      coverUrl: form.get("coverUrl") ?? "",
      categories: form.get("categories") ?? "",
      tags: form.get("tags") ?? "",
    });
    if (!parsed.success) throw new ActionError(saveErrors.datos);
    let sections;
    try {
      const raw = String(form.get("sections") ?? "[]");
      if (raw.length > 1000000) throw new Error();
      sections = validateSections(JSON.parse(raw));
    } catch {
      throw new ActionError(saveErrors.bloques);
    }
    const p = parsed.data;
    const cover = p.coverUrl ? safeUrl(p.coverUrl, true) : null;
    if (p.coverUrl && !cover) throw new ActionError(saveErrors.datos);
    const split = (v: string) =>
      [
        ...new Set(
          v
            .split(",")
            .map((s) => plainText(s).trim())
            .filter(Boolean),
        ),
      ].slice(0, 20);
    const data = {
      title: plainText(p.title),
      slug: p.slug,
      excerpt: plainText(p.excerpt),
      coverUrl: cover,
      sections,
      categories: split(p.categories),
      tags: split(p.tags),
      status: p.status,
      commentsEnabled: form.get("commentsEnabled") === "on",
      updatedAt: new Date(),
    };
    let post;
    if (id) {
      const [existing] = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.id, id));
      if (!existing) throw new ActionError("La entrada ya no existe.");
      try {
        [post] = await db
          .update(blogPosts)
          .set({
            ...data,
            revision: sql`${blogPosts.revision}+1`,
            publishedAt:
              p.status === "published"
                ? (existing.publishedAt ?? new Date())
                : existing.publishedAt,
          })
          .where(and(eq(blogPosts.id, id), eq(blogPosts.revision, revision)))
          .returning();
      } catch {
        throw new ActionError(saveErrors.slug);
      }
    } else {
      try {
        [post] = await db
          .insert(blogPosts)
          .values({
            ...data,
            authorId: viewer.id,
            authorName: viewer.name,
            publishedAt: p.status === "published" ? new Date() : null,
          })
          .returning();
      } catch {
        throw new ActionError(saveErrors.slug);
      }
    }
    if (!post) throw new ActionError(saveErrors.conflicto);
    revalidatePath("/");
    revalidatePath(`/entradas/${post.slug}`);
    redirect(`/admin/entradas/${post.id}?guardado=1`);
  });
}
export async function addComment(
  _state: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const viewer = await requireViewer();
    const id = Number(form.get("postId"));
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id));
    if (!post) throw new ActionError("La entrada ya no existe.");
    const path = `/entradas/${post.slug}`;
    if (post.status !== "published" || !post.commentsEnabled)
      throw new ActionError("La conversación está cerrada.");
    if (!viewer.emailVerified)
      throw new ActionError(
        "Verifica tu correo desde tu cuenta para comentar.",
      );
    const content = String(form.get("content") ?? "").trim();
    if (content.length < 3 || content.length > 2000)
      throw new ActionError("Escribe entre 3 y 2000 caracteres.");
    const { allowed } = await consumeRateLimit({
      key: `blog:comment:user:${viewer.id}`,
      windowMs: 10 * 60 * 1000,
      max: 5,
    });
    if (!allowed)
      throw new ActionError(
        "Espera unos minutos antes de enviar otro comentario.",
      );
    await db.insert(blogComments).values({
      postId: id,
      authorId: viewer.id,
      authorName: viewer.name,
      content,
    });
    await notifyCommentPending({ post, actorId: viewer.id });
    revalidatePath(path);
    return {
      ok: true,
      message: "Gracias. Tu comentario se publicará después de revisarlo.",
    };
  });
}
export async function moderateComment(
  _state: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const viewer = await requireManager();
    const status = z
      .enum(["approved", "hidden", "pending"])
      .parse(form.get("status"));
    const id = z.coerce.number().int().positive().parse(form.get("id"));
    const [existing] = await db
      .select({ comment: blogComments, post: blogPosts })
      .from(blogComments)
      .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
      .where(eq(blogComments.id, id));
    if (!existing) throw new ActionError("El comentario ya no existe.");
    await db
      .update(blogComments)
      .set({ status })
      .where(eq(blogComments.id, id));
    if (
      existing.comment.authorId &&
      existing.comment.status !== status &&
      status !== "pending"
    )
      await notifyCommentModerated({
        post: existing.post,
        commentId: id,
        authorId: existing.comment.authorId,
        actorId: viewer.id,
        status,
      });
    revalidatePath("/admin/comentarios");
    revalidatePath("/entradas/[slug]", "page");
    return {
      ok: true,
      message: {
        approved: "Comentario aprobado.",
        hidden: "Comentario ocultado.",
        pending: "Comentario devuelto a revisión.",
      }[status],
    };
  });
}
