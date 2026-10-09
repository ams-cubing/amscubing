import Link from "next/link";
import { blogPosts } from "@workspace/db/schema";
export function PostCard({ post }: { post: typeof blogPosts.$inferSelect }) {
  return (
    <Link href={`/entradas/${post.slug}`} className="card">
      {post.coverUrl && <img src={post.coverUrl} alt="" loading="lazy" />}
      <div className="card-body">
        {post.categories.map((c) => (
          <span className="tag" key={c}>
            {c}
          </span>
        ))}
        <h2>{post.title}</h2>
        <div className="meta">
          {post.publishedAt?.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}{" "}
          · {post.authorName}
        </div>
        <p>{post.excerpt}</p>
        <strong className="eyebrow">Leer historia ↗</strong>
      </div>
    </Link>
  );
}
