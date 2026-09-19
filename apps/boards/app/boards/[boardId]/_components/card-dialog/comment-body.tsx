"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { segmentCommentBody } from "@workspace/db/mentions";

import type { TeamPerson } from "../../_lib/team";

function CommentText({ value }: { value: string }) {
  // Preserve single newlines that whitespace-pre-wrap used to keep.
  const withHardBreaks = value.replace(/\n/g, "  \n");

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <span>{children}</span>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {children}
          </a>
        ),
      }}
    >
      {withHardBreaks}
    </ReactMarkdown>
  );
}

export function CommentBody({
  body,
  team,
}: {
  body: string;
  team: TeamPerson[];
}) {
  const segments = segmentCommentBody(
    body,
    team.map((person) => ({
      userId: person.userId,
      wcaId: person.wcaId,
      name: person.name,
    })),
  );

  return (
    <div className="min-w-0 wrap-break-word whitespace-pre-wrap rounded-md border bg-background px-3 py-2 text-sm">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <CommentText key={index} value={segment.value} />;
        }

        if (segment.type === "groupMention") {
          return (
            <span
              key={index}
              className="rounded bg-primary/10 px-1 font-medium text-primary"
              title={segment.label}
            >
              @{segment.label}
            </span>
          );
        }

        return (
          <span
            key={index}
            className="rounded bg-primary/10 px-1 font-medium text-primary"
            title={segment.name ?? segment.wcaId}
          >
            @{segment.name ?? segment.wcaId}
          </span>
        );
      })}
    </div>
  );
}
