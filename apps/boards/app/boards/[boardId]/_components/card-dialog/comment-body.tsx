"use client";

import { segmentCommentBody } from "@workspace/db/mentions";

import type { TeamPerson } from "../../_lib/team";

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
    <p className="whitespace-pre-wrap rounded-md border bg-background px-3 py-2 text-sm">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.value}</span>;
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
    </p>
  );
}
