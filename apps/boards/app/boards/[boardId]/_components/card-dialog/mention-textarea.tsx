"use client";

import * as React from "react";

import {
  Mention,
  MentionContent,
  MentionInput,
  MentionItem,
} from "@workspace/ui/components/mention";
import { Textarea } from "@workspace/ui/components/textarea";

import type { TeamPerson } from "../../_lib/team";

export function MentionTextarea({
  value,
  onChange,
  team,
  disabled,
  placeholder = "Escribe un comentario... Usa @ para mencionar",
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  team: TeamPerson[];
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const teamByWcaId = React.useMemo(
    () => new Map(team.map((person) => [person.wcaId, person])),
    [team],
  );

  const options = React.useMemo(() => team.map((person) => person.wcaId), [team]);

  const onFilter = React.useCallback(
    (items: string[], term: string) => {
      const query = term.trim().toLowerCase();
      const filtered = items.filter((wcaId) => {
        const person = teamByWcaId.get(wcaId);
        if (!person) return false;
        if (!query) return true;
        return (
          person.name.toLowerCase().includes(query) ||
          person.wcaId.toLowerCase().includes(query)
        );
      });

      return filtered.slice(0, 8);
    },
    [teamByWcaId],
  );

  return (
    <Mention
      trigger="@"
      disabled={disabled}
      inputValue={value}
      onInputValueChange={onChange}
      onFilter={onFilter}
      className="w-full"
    >
      <MentionInput asChild>
        <Textarea placeholder={placeholder} rows={rows} disabled={disabled} />
      </MentionInput>
      <MentionContent>
        {options.map((wcaId) => {
          const person = teamByWcaId.get(wcaId);
          if (!person) return null;

          return (
            <MentionItem key={person.userId} value={wcaId} label={wcaId}>
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">{person.name}</span>
                <span className="text-xs text-muted-foreground">
                  @{person.wcaId}
                </span>
              </div>
            </MentionItem>
          );
        })}
      </MentionContent>
    </Mention>
  );
}
