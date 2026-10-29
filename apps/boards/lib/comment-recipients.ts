/** Plain comments reach the whole board team plus card assignees; mentioned users get `card_mention` instead. */
export function commentRecipients(input: {
  team: { id: string }[];
  cardMemberIds: string[];
  mentionedIds: ReadonlySet<string>;
  actorId: string;
}): string[] {
  const ids = new Set<string>();
  for (const id of [
    ...input.team.map((member) => member.id),
    ...input.cardMemberIds,
  ]) {
    if (id === input.actorId || input.mentionedIds.has(id)) continue;
    ids.add(id);
  }
  return [...ids];
}
