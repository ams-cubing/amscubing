/** WCA ID mention tokens in comment bodies, e.g. @2016TORO03 */

const MENTION_PATTERN = /@([A-Za-z0-9]+)/g;

export function parseMentions(body: string): string[] {
  const seen = new Set<string>();
  const wcaIds: string[] = [];

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const wcaId = match[1];
    if (!wcaId || seen.has(wcaId)) continue;
    seen.add(wcaId);
    wcaIds.push(wcaId);
  }

  return wcaIds;
}

export type MentionTeamMember = {
  userId: string;
  wcaId: string;
  name: string;
};

export function resolveMentionedUsers(
  wcaIds: string[],
  team: MentionTeamMember[],
): MentionTeamMember[] {
  const byWcaId = new Map(team.map((member) => [member.wcaId, member]));
  const resolved: MentionTeamMember[] = [];
  const seen = new Set<string>();

  for (const wcaId of wcaIds) {
    const member = byWcaId.get(wcaId);
    if (!member || seen.has(member.userId)) continue;
    seen.add(member.userId);
    resolved.push(member);
  }

  return resolved;
}

export type CommentBodySegment =
  | { type: "text"; value: string }
  | { type: "mention"; wcaId: string; name?: string };

export function segmentCommentBody(
  body: string,
  team: MentionTeamMember[],
): CommentBodySegment[] {
  const byWcaId = new Map(team.map((member) => [member.wcaId, member]));
  const segments: CommentBodySegment[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    const wcaId = match[1];
    if (!wcaId) continue;

    if (index > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, index) });
    }

    segments.push({
      type: "mention",
      wcaId,
      name: byWcaId.get(wcaId)?.name,
    });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: body }];
}
