"use client";

import * as React from "react";

import { GROUP_MENTION_OPTIONS } from "@workspace/db/mentions";
import {
  Mention,
  MentionContent,
  MentionInput,
  MentionItem,
  MentionPortal,
} from "@workspace/ui/components/mention";

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
  const [mentionValues, setMentionValues] = React.useState<string[]>([]);
  const [resetKey, setResetKey] = React.useState(0);
  const prevValueRef = React.useRef(value);

  const teamByWcaId = React.useMemo(
    () => new Map(team.map((person) => [person.wcaId, person])),
    [team],
  );

  React.useEffect(() => {
    if (value === "" && prevValueRef.current !== "") {
      setMentionValues([]);
      setResetKey((key) => key + 1);
    }
    prevValueRef.current = value;
  }, [value]);

  const onFilter = React.useCallback(
    (items: string[], term: string) => {
      const query = term.trim().toLowerCase();
      const filtered = items.filter((itemValue) => {
        const group = GROUP_MENTION_OPTIONS.find(
          (option) => option.value === itemValue,
        );
        if (group) {
          if (!query) return true;
          return (
            group.label.toLowerCase().includes(query) ||
            group.value.toLowerCase().includes(query)
          );
        }

        const person = teamByWcaId.get(itemValue);
        if (!person) return false;
        if (!query) return true;
        return (
          person.name.toLowerCase().includes(query) ||
          person.wcaId.toLowerCase().includes(query)
        );
      });

      return filtered.slice(0, 10);
    },
    [teamByWcaId],
  );

  return (
    <Mention
      key={resetKey}
      trigger="@"
      disabled={disabled}
      value={mentionValues}
      onValueChange={setMentionValues}
      inputValue={value}
      onInputValueChange={onChange}
      onFilter={onFilter}
      className="w-full"
    >
      <MentionInput
        placeholder={placeholder}
        className="min-h-16 resize-y text-base md:text-sm"
        asChild
      >
        <textarea rows={rows} />
      </MentionInput>
      <MentionPortal>
        <MentionContent>
          {GROUP_MENTION_OPTIONS.map((group) => (
            <MentionItem
              key={group.value}
              value={group.value}
              label={group.label}
            >
              <span className="text-sm font-medium">{group.label}</span>
              <span className="text-xs text-muted-foreground">
                @{group.value}
              </span>
            </MentionItem>
          ))}
          {team.map((person) => (
            <MentionItem
              key={person.userId}
              value={person.wcaId}
              label={person.wcaId}
            >
              <span className="text-sm font-medium">{person.name}</span>
              <span className="text-xs text-muted-foreground">
                @{person.wcaId}
              </span>
            </MentionItem>
          ))}
        </MentionContent>
      </MentionPortal>
    </Mention>
  );
}
