"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";
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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [mentionStart, setMentionStart] = React.useState<number | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return team.slice(0, 8);
    return team
      .filter(
        (person) =>
          person.name.toLowerCase().includes(q) ||
          person.wcaId.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, team]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function closeMentionPicker() {
    setOpen(false);
    setQuery("");
    setMentionStart(null);
  }

  function insertMention(person: TeamPerson) {
    const textarea = textareaRef.current;
    if (!textarea || mentionStart == null) return;

    const before = value.slice(0, mentionStart);
    const after = value.slice(textarea.selectionStart);
    const mention = `@${person.wcaId} `;
    const next = `${before}${mention}${after}`;
    onChange(next);
    closeMentionPicker();

    requestAnimationFrame(() => {
      const pos = before.length + mention.length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next);

    const cursor = e.target.selectionStart;
    const prefix = next.slice(0, cursor);
    const atIndex = prefix.lastIndexOf("@");

    if (atIndex >= 0) {
      const between = prefix.slice(atIndex + 1);
      if (!/\s/.test(between)) {
        setMentionStart(atIndex);
        setQuery(between);
        setOpen(true);
        return;
      }
    }

    closeMentionPicker();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((index) => (index + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const person = filtered[activeIndex];
      if (person) insertMention(person);
    } else if (e.key === "Escape") {
      closeMentionPicker();
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(closeMentionPicker, 120);
        }}
      />
      {open && filtered.length > 0 ? (
        <ul
          className="absolute bottom-full z-50 mb-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {filtered.map((person, index) => (
            <li key={person.userId}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full flex-col rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  index === activeIndex && "bg-accent",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(person);
                }}
              >
                <span className="font-medium">{person.name}</span>
                <span className="text-xs text-muted-foreground">
                  @{person.wcaId}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
