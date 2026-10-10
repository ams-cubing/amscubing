import { getBlogUrl } from "@workspace/auth/urls";
import { db } from "@workspace/db";
import {
  formatNotificationTitle,
  insertNotifications,
} from "@workspace/db/notifications";
import { blogStaff } from "@workspace/db/schema";
import { log } from "@workspace/server/log";
import { inArray } from "drizzle-orm";

type Post = { id: number; slug: string; title: string };

async function safely(event: string, send: () => Promise<void>) {
  try {
    await send();
  } catch (error) {
    log.error("blog.notification_failed", { event, error });
  }
}

export function notifyCommentPending(opts: {
  post: Post;
  commentId?: number;
  actorId: string;
}) {
  return safely("blog_comment_pending", async () => {
    const moderators = await db
      .select({ userId: blogStaff.userId })
      .from(blogStaff)
      .where(inArray(blogStaff.role, ["administrator", "developer", "editor"]));

    await insertNotifications(
      db,
      moderators.map(({ userId }) => ({
        recipientId: userId,
        actorId: opts.actorId,
        type: "blog_comment_pending" as const,
        title: formatNotificationTitle("blog_comment_pending", {
          postTitle: opts.post.title,
        }),
        href: `${getBlogUrl()}/admin/comentarios`,
        payload: {
          postId: opts.post.id,
          postTitle: opts.post.title,
          commentId: opts.commentId,
        },
      })),
    );
  });
}

export function notifyCommentModerated(opts: {
  post: Post;
  commentId: number;
  authorId: string;
  actorId: string;
  status: "approved" | "hidden";
}) {
  const type =
    opts.status === "approved"
      ? "blog_comment_approved"
      : "blog_comment_hidden";

  return safely(type, () =>
    insertNotifications(db, [
      {
        recipientId: opts.authorId,
        actorId: opts.actorId,
        type,
        title: formatNotificationTitle(type, { postTitle: opts.post.title }),
        href: `${getBlogUrl()}/entradas/${opts.post.slug}`,
        payload: {
          postId: opts.post.id,
          postTitle: opts.post.title,
          commentId: opts.commentId,
        },
      },
    ]),
  );
}
