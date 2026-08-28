/** Mention tokens in comment bodies, e.g. @2016TORO03 or @organizadores */

const MENTION_PATTERN = /@([A-Za-z0-9]+)/g;

export const GROUP_MENTION_KINDS = ["organizers", "delegates", "all"] as const;
export type GroupMentionKind = (typeof GROUP_MENTION_KINDS)[number];

const GROUP_MENTION_ALIASES: Record<GroupMentionKind, readonly string[]> = {
  organizers: ["organizadores", "organizers"],
  delegates: ["delegados", "delegates"],
  all: ["todos", "all"],
};

const GROUP_MENTION_LABELS: Record<GroupMentionKind, string> = {
  organizers: "Organizadores",
  delegates: "Delegados",
  all: "Todos",
};

const GROUP_MENTION_CANONICAL: Record<GroupMentionKind, string> = {
  organizers: "organizadores",
  delegates: "delegados",
  all: "todos",
};

const aliasToGroupKind = new Map<string, GroupMentionKind>();
for (const kind of GROUP_MENTION_KINDS) {
  for (const alias of GROUP_MENTION_ALIASES[kind]) {
    aliasToGroupKind.set(alias.toLowerCase(), kind);
  }
}

export function groupMentionKind(token: string): GroupMentionKind | null {
  return aliasToGroupKind.get(token.toLowerCase()) ?? null;
}

export function groupMentionLabel(kind: GroupMentionKind): string {
  return GROUP_MENTION_LABELS[kind];
}

export function groupMentionCanonical(kind: GroupMentionKind): string {
  return GROUP_MENTION_CANONICAL[kind];
}

export const GROUP_MENTION_OPTIONS = GROUP_MENTION_KINDS.map((kind) => ({
  kind,
  value: GROUP_MENTION_CANONICAL[kind],
  label: GROUP_MENTION_LABELS[kind],
}));

export type ParsedMentions = {
  userWcaIds: string[];
  groups: GroupMentionKind[];
};

export function parseMentions(body: string): ParsedMentions {
  const seenUsers = new Set<string>();
  const seenGroups = new Set<GroupMentionKind>();
  const userWcaIds: string[] = [];
  const groups: GroupMentionKind[] = [];

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const token = match[1];
    if (!token) continue;

    const groupKind = groupMentionKind(token);
    if (groupKind) {
      if (seenGroups.has(groupKind)) continue;
      seenGroups.add(groupKind);
      groups.push(groupKind);
      continue;
    }

    if (seenUsers.has(token)) continue;
    seenUsers.add(token);
    userWcaIds.push(token);
  }

  return { userWcaIds, groups };
}

export type MentionTeamMember = {
  userId: string;
  wcaId: string;
  name: string;
};

export type MentionRoleGroups = {
  all: MentionTeamMember[];
  organizers: MentionTeamMember[];
  delegates: MentionTeamMember[];
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

export function resolveAllMentionedUsers(
  parsed: ParsedMentions,
  roleGroups: MentionRoleGroups,
): MentionTeamMember[] {
  const resolved: MentionTeamMember[] = [];
  const seen = new Set<string>();

  const addMembers = (members: MentionTeamMember[]) => {
    for (const member of members) {
      if (seen.has(member.userId)) continue;
      seen.add(member.userId);
      resolved.push(member);
    }
  };

  for (const kind of parsed.groups) {
    if (kind === "organizers") addMembers(roleGroups.organizers);
    else if (kind === "delegates") addMembers(roleGroups.delegates);
    else addMembers(roleGroups.all);
  }

  addMembers(resolveMentionedUsers(parsed.userWcaIds, roleGroups.all));

  return resolved;
}

export type CommentBodySegment =
  | { type: "text"; value: string }
  | { type: "mention"; wcaId: string; name?: string }
  | { type: "groupMention"; kind: GroupMentionKind; label: string };

export function segmentCommentBody(
  body: string,
  team: MentionTeamMember[],
): CommentBodySegment[] {
  const byWcaId = new Map(team.map((member) => [member.wcaId, member]));
  const segments: CommentBodySegment[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    const token = match[1];
    if (!token) continue;

    if (index > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, index) });
    }

    const groupKind = groupMentionKind(token);
    if (groupKind) {
      segments.push({
        type: "groupMention",
        kind: groupKind,
        label: groupMentionLabel(groupKind),
      });
    } else {
      segments.push({
        type: "mention",
        wcaId: token,
        name: byWcaId.get(token)?.name,
      });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: body }];
}
