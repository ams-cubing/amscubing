"use client";

import { MessageSquare } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";

import { formatCommentTime, initials } from "../../_lib/card-format";
import type { BoardCard } from "../../_lib/types";

export function CardCommentsSection({
  card,
  commentBody,
  pending,
  onCommentBodyChange,
  onDelete,
  onAdd,
}: {
  card: BoardCard;
  commentBody: string;
  pending: boolean;
  onCommentBodyChange: (value: string) => void;
  onDelete: (commentId: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col border-t bg-muted/20 lg:border-t-0 lg:border-l">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MessageSquare className="size-4" />
        <h3 className="text-sm font-medium">Comentarios y actividad</h3>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {card.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay comentarios.
          </p>
        ) : (
          card.comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarImage
                  src={comment.author.image || undefined}
                  alt={comment.author.name}
                />
                <AvatarFallback>{initials(comment.author.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCommentTime(comment.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap rounded-md border bg-background px-3 py-2 text-sm">
                  {comment.body}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => onDelete(comment.id)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      <form
        className="shrink-0 border-t p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!commentBody.trim()) return;
          onAdd();
        }}
      >
        <Textarea
          placeholder="Escribe un comentario..."
          value={commentBody}
          rows={3}
          onChange={(e) => onCommentBodyChange(e.target.value)}
          disabled={pending}
        />
        <Button
          type="submit"
          size="sm"
          className="mt-2"
          disabled={pending || !commentBody.trim()}
        >
          Comentar
        </Button>
      </form>
    </div>
  );
}
