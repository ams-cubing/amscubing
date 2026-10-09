"use server";
import { db } from "@workspace/db";
import { blogPosts, blogComments, blogStaff, user } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManager, requireViewer } from "@/lib/auth";
import { validateSections, safeUrl, slugify, plainText } from "@/lib/content";
import { consumeLimit } from "@/lib/rate-limit";

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
export async function savePost(form: FormData) {
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
  const path = id ? `/admin/entradas/${id}` : "/admin/entradas/nueva";
  if (!parsed.success) redirect(`${path}?error=datos`);
  let sections;
  try {
    const raw = String(form.get("sections") ?? "[]");
    if (raw.length > 1000000) throw new Error();
    sections = validateSections(JSON.parse(raw));
  } catch {
    redirect(`${path}?error=bloques`);
  }
  const p = parsed.data;
  const cover = p.coverUrl ? safeUrl(p.coverUrl, true) : null;
  if (p.coverUrl && !cover) redirect(`${path}?error=datos`);
  const split = (v: string) =>
    [
      ...new Set(
        v
          .split(",")
          .map((s) => plainText(s).trim())
          .filter(Boolean),
      ),
    ].slice(0, 20);
  let post;
  try {
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
    if (id) {
      const [existing] = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.id, id));
      if (!existing) redirect("/admin");
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
    } else
      [post] = await db
        .insert(blogPosts)
        .values({
          ...data,
          authorId: viewer.id,
          authorName: viewer.name,
          publishedAt: p.status === "published" ? new Date() : null,
        })
        .returning();
  } catch (e) {
    if (e instanceof Error && "digest" in e) throw e;
    redirect(`${path}?error=slug`);
  }
  if (!post) redirect(`${path}?error=conflicto`);
  revalidatePath("/");
  revalidatePath(`/entradas/${post.slug}`);
  redirect(`/admin/entradas/${post.id}?guardado=1`);
}
export async function addComment(form: FormData) {
  const viewer = await requireViewer();
  const id = Number(form.get("postId"));
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) redirect("/");
  const path = `/entradas/${post.slug}`;
  if (post.status !== "published" || !post.commentsEnabled)
    redirect(`${path}?aviso=comentarios-cerrados`);
  if (!viewer.emailVerified) redirect(`${path}?aviso=verifica-correo`);
  const content = String(form.get("content") ?? "").trim();
  if (content.length < 3 || content.length > 2000)
    redirect(`${path}?aviso=comentario-invalido`);
  if (!(await consumeLimit(`comment:${viewer.id}`, 5, 600)))
    redirect(`${path}?aviso=demasiados-comentarios`);
  await db
    .insert(blogComments)
    .values({
      postId: id,
      authorId: viewer.id,
      authorName: viewer.name,
      content,
    });
  revalidatePath(path);
  redirect(`${path}?aviso=comentario-enviado`);
}
export async function moderateComment(form: FormData) {
  await requireManager();
  const status = z
    .enum(["approved", "hidden", "pending"])
    .parse(form.get("status"));
  const id = z.coerce.number().int().positive().parse(form.get("id"));
  await db.update(blogComments).set({ status }).where(eq(blogComments.id, id));
  revalidatePath("/admin/comentarios");
  revalidatePath("/entradas/[slug]", "page");
  redirect("/admin/comentarios");
}
export async function grantStaff(form: FormData) {
  const viewer = await requireManager();
  if (!viewer.canManageStaff) redirect("/admin?error=permisos");
  const email = z.email().parse(form.get("email")).trim().toLowerCase();
  const role = z
    .enum(["administrator", "developer", "editor", "none"])
    .parse(form.get("role"));
  const [target] = await db.select().from(user).where(eq(user.email, email));
  if (!target || !target.emailVerified) redirect("/admin?error=cuenta");
  if (target.id === viewer.id) redirect("/admin?error=propio");
  if (role === "none")
    await db.delete(blogStaff).where(eq(blogStaff.userId, target.id));
  else
    await db
      .insert(blogStaff)
      .values({ userId: target.id, role })
      .onConflictDoUpdate({ target: blogStaff.userId, set: { role } });
  revalidatePath("/admin");
  redirect("/admin?permisos=1");
}
