import { db } from "@workspace/db";
import { blogComments, blogPosts } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireManager } from "@/lib/auth";
import { moderateComment } from "@/app/actions";
export default async function Page() {
  await requireManager();
  const comments = await db
    .select({ comment: blogComments, post: blogPosts.title })
    .from(blogComments)
    .innerJoin(blogPosts, eq(blogComments.postId, blogPosts.id))
    .orderBy(desc(blogComments.createdAt))
    .limit(200);
  return (
    <section className="section shell">
      <h1>Comentarios</h1>
      <p>Revisa las conversaciones antes de hacerlas públicas.</p>
      {comments.map(({ comment: c, post }) => (
        <div key={c.id} className="panel">
          <span className="tag">{c.status}</span>
          <h3>{post}</h3>
          <p>
            <strong>{c.authorName}</strong> ·{" "}
            {c.createdAt.toLocaleDateString("es-MX")}
          </p>
          <p className="text-content">{c.content}</p>
          <form action={moderateComment} className="tool-buttons">
            <input name="id" type="hidden" value={c.id} />
            <button className="button small" name="status" value="approved">
              Aprobar
            </button>
            <button
              className="button small secondary"
              name="status"
              value="hidden"
            >
              Ocultar
            </button>
            <button
              className="button small secondary"
              name="status"
              value="pending"
            >
              Pendiente
            </button>
          </form>
        </div>
      ))}
    </section>
  );
}
