"use client";

import { MessageSquare } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";

import { formatCommentTime, initials } from "../../_lib/card-format";
import type { BoardCard } from "../../_lib/types";
import type { TeamPerson } from "../../_lib/team";
import { CommentBody } from "./comment-body";
import { MentionTextarea } from "./mention-textarea";

export function CardCommentsSection({
  card,
  team,
  commentBody,
  pending,
  onCommentBodyChange,
  onDelete,
  onAdd,
}: {
  card: BoardCard;
  team: TeamPerson[];
  commentBody: string;
  pending: boolean;
  onCommentBodyChange: (value: string) => void;
  onDelete: (commentId: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col border-t bg-muted/20 lg:h-full lg:overflow-hidden lg:border-t-0 lg:border-l">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <MessageSquare className="size-4 shrink-0" />
        <h3 className="min-w-0 text-sm font-medium">Comentarios y actividad</h3>
      </div>
      <div className="min-w-0 space-y-4 px-4 py-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {card.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay comentarios.
          </p>
        ) : (
          card.comments.map((comment) => (
            <div key={comment.id} className="flex min-w-0 gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarImage
                  src={comment.author.image || undefined}
                  alt={comment.author.name}
                />
                <AvatarFallback>{initials(comment.author.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="min-w-0 break-words text-sm font-medium">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCommentTime(comment.createdAt)}
                  </span>
                </div>
                <CommentBody body={comment.body} team={team} />
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
        className="flex shrink-0 flex-col gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!commentBody.trim()) return;
          onAdd();
        }}
      >
        <MentionTextarea
          value={commentBody}
          team={team}
          disabled={pending}
          onChange={onCommentBodyChange}
        />
        <Button
          type="submit"
          size="sm"
          className="w-full sm:w-auto sm:self-start"
          disabled={pending || !commentBody.trim()}
        >
          Comentar
        </Button>
      </form>
    </div>
  );
}
