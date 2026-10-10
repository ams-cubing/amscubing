import Link from "next/link";
import { blogPosts } from "@workspace/db/schema";
import { Tag } from "./tag";
export function PostCard({ post }: { post: typeof blogPosts.$inferSelect }) {
  return (
    <Link
      href={`/entradas/${post.slug}`}
      className="block overflow-hidden rounded-3xl bg-white shadow-[0_8px_32px_rgba(1,11,25,0.05)] transition-transform hover:-translate-y-1"
    >
      {post.coverUrl && (
        <img
          src={post.coverUrl}
          alt=""
          loading="lazy"
          className="h-57.5 w-full object-cover"
        />
      )}
      <div className="p-6">
        {post.categories.map((c) => (
          <Tag key={c}>{c}</Tag>
        ))}
        <h2 className="ams-heading text-lg leading-snug font-bold">
          {post.title}
        </h2>
        <div className="mt-2 mb-4 text-[13px] text-ams-navy/60">
          {post.publishedAt?.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}{" "}
          · {post.authorName}
        </div>
        <p className="mb-4 text-base text-ams-navy/70">{post.excerpt}</p>
        <strong className="ams-heading text-xs text-ams-red">
          Leer historia ↗
        </strong>
      </div>
    </Link>
  );
}
