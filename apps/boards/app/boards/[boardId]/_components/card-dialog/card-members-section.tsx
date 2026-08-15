"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { AvatarGroup } from "@workspace/ui/components/avatar-group";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import { initials } from "../../_lib/card-format";
import type { BoardCard } from "../../_lib/types";

export type TeamPerson = {
  userId: string;
  wcaId: string;
  name: string;
  image: string | null;
  isPrimary: boolean;
};

export function CardMembersSection({
  card,
  team,
  memberIds,
  onToggle,
}: {
  card: BoardCard;
  team: TeamPerson[];
  memberIds: Set<string>;
  onToggle: (userId: string, checked: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Miembros</Label>
      {card.members.length > 0 && (
        <AvatarGroup size={28}>
          {card.members.map((member) => (
            <Avatar key={member.userId} title={member.user.name}>
              <AvatarImage
                src={member.user.image || undefined}
                alt={member.user.name}
              />
              <AvatarFallback>{initials(member.user.name)}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      )}
      <div className="flex flex-wrap gap-2">
        {team.map((person) => {
          const checked = memberIds.has(person.userId);
          return (
            <button
              key={person.userId}
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition",
                checked
                  ? "border-foreground/40 bg-muted"
                  : "opacity-70 hover:opacity-100",
              )}
              onClick={() => onToggle(person.userId, !checked)}
            >
              <Avatar className="size-5">
                <AvatarImage
                  src={person.image || undefined}
                  alt={person.name}
                />
                <AvatarFallback className="text-[9px]">
                  {initials(person.name)}
                </AvatarFallback>
              </Avatar>
              {person.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
