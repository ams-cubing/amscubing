import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  consumeRateLimit,
  requireViewer,
  selectedPosts,
  insertValues,
  notifyCommentPending,
} = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  requireViewer: vi.fn(),
  selectedPosts: { current: [] as unknown[] },
  insertValues: vi.fn(),
  notifyCommentPending: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@workspace/db/rate-limit", () => ({
  consumeRateLimit,
}));

vi.mock("@/lib/auth", () => ({
  requireViewer,
  requireManager: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  notifyCommentPending,
  notifyCommentModerated: vi.fn(),
  notifyBlogStaffChanged: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: async () => selectedPosts.current }),
    }),
    insert: () => ({ values: insertValues }),
  },
}));

import { addComment } from "./actions";

function commentForm(content = "Un comentario de prueba") {
  const form = new FormData();
  form.set("postId", "7");
  form.set("content", content);
  return form;
}

describe("addComment", () => {
  beforeEach(() => {
    consumeRateLimit.mockReset();
    insertValues.mockReset();
    notifyCommentPending.mockReset();
    requireViewer.mockResolvedValue({
      id: "user-1",
      name: "Lectora",
      emailVerified: true,
    });
    selectedPosts.current = [
      { id: 7, slug: "hola", status: "published", commentsEnabled: true },
    ];
  });

  it("rejects the comment when the shared rate limit is exhausted", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, count: 6 });

    await expect(addComment(commentForm())).rejects.toThrow(
      "REDIRECT:/entradas/hola?aviso=demasiados-comentarios",
    );
    expect(consumeRateLimit).toHaveBeenCalledWith({
      key: "blog:comment:user:user-1",
      windowMs: 10 * 60 * 1000,
      max: 5,
    });
    expect(insertValues).not.toHaveBeenCalled();
    expect(notifyCommentPending).not.toHaveBeenCalled();
  });

  it("stores the comment when under the limit", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: true, count: 1 });

    await expect(addComment(commentForm())).rejects.toThrow(
      "REDIRECT:/entradas/hola?aviso=comentario-enviado",
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ postId: 7, authorId: "user-1" }),
    );
    expect(notifyCommentPending).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "user-1" }),
    );
  });
});
