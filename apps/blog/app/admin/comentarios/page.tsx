import { db } from "@workspace/db";
import { blogComments, blogPosts } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { Button } from "@workspace/ui/components/button";
import { requireManager } from "@/lib/auth";
import { moderateComment } from "@/app/actions";
import { Tag } from "@/components/tag";
export default async function Page() {
  await requireManager();
  const comments = await db
    .select({ comment: blogComments, post: blogPosts.title })
    .from(blogComments)
    .innerJoin(blogPosts, eq(blogComments.postId, blogPosts.id))
    .orderBy(desc(blogComments.createdAt))
    .limit(200);
  return (
    <section className="ams-container max-w-295 py-14">
      <h1 className="ams-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[1.08]">
        Comentarios
      </h1>
      <p className="mb-6">Revisa las conversaciones antes de hacerlas públicas.</p>
      {comments.map(({ comment: c, post }) => (
        <div key={c.id} className="mb-6 rounded-3xl bg-white p-5 sm:p-8">
          <Tag>{c.status}</Tag>
          <h3 className="ams-heading text-lg font-bold">{post}</h3>
          <p>
            <strong>{c.authorName}</strong> ·{" "}
            {c.createdAt.toLocaleDateString("es-MX")}
          </p>
          <p className="mb-4 whitespace-pre-wrap">{c.content}</p>
          <form action={moderateComment} className="flex flex-wrap gap-1.5">
            <input name="id" type="hidden" value={c.id} />
            <Button
              size="sm"
              variant="destructive"
              name="status"
              value="approved"
            >
              Aprobar
            </Button>
            <Button size="sm" variant="brand" name="status" value="hidden">
              Ocultar
            </Button>
            <Button size="sm" variant="brand" name="status" value="pending">
              Pendiente
            </Button>
          </form>
        </div>
      ))}
    </section>
  );
}
