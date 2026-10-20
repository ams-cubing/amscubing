"use client";

import {
  AlignLeft,
  Bell,
  CalendarClock,
  CheckSquare,
  Paperclip,
} from "lucide-react";
import * as React from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { AvatarGroup } from "@workspace/ui/components/avatar-group";
import { cn } from "@workspace/ui/lib/utils";

import { formatDueDate } from "../_lib/card-format";
import type { BoardCard } from "../_lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function KanbanCardFace({
  card,
  relevant,
  unreadCount = 0,
  onOpen,
  dragHandle,
  className,
  ...props
}: {
  card: BoardCard;
  relevant: boolean;
  unreadCount?: number;
  onOpen?: () => void;
  dragHandle?: React.ReactNode;
  className?: string;
} & React.ComponentProps<"div">) {
  const checklistTotal = card.checklists.reduce(
    (sum, checklist) => sum + checklist.items.length,
    0,
  );
  const checklistDone = card.checklists.reduce(
    (sum, checklist) =>
      sum + checklist.items.filter((item) => item.done).length,
    0,
  );
  const hasDescription = Boolean(card.description?.trim());
  const attachmentCount = card.attachments.length;
  const hasDueDate = Boolean(card.dueDate);
  const hasMembers = card.members.length > 0;
  const hasUnread = unreadCount > 0;
  const hasMeta =
    hasDescription ||
    checklistTotal > 0 ||
    attachmentCount > 0 ||
    hasDueDate ||
    hasMembers ||
    hasUnread;
  const coverUrl = card.coverUrl?.trim() || null;

  return (
    <div
      {...props}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : props.tabIndex}
      onClick={(event) => {
        props.onClick?.(event);
        onOpen?.();
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (!onOpen) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "w-full overflow-hidden rounded-md border bg-card text-left shadow-xs transition hover:border-foreground/20",
        onOpen && "cursor-pointer",
        !relevant && "opacity-50",
        className,
      )}
    >
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- unoptimized remote covers (UploadThing / arbitrary URLs)
        <img
          src={coverUrl}
          alt=""
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="p-2.5">
        {card.cardLabels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {card.cardLabels.map((cl) => (
              <span
                key={cl.labelId}
                className="h-1.5 w-10 rounded-full"
                style={{ backgroundColor: cl.label.color }}
                title={cl.label.name}
              />
            ))}
          </div>
        )}
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1 text-sm font-medium leading-snug">
            {card.title}
          </div>
          {dragHandle}
        </div>
        {hasMeta && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {hasUnread && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-[#e85d75] px-1.5 py-0.5 font-medium text-white"
                title={`${unreadCount} notificación${unreadCount === 1 ? "" : "es"} sin leer`}
              >
                <Bell className="size-3.5" />
                {unreadCount}
              </span>
            )}
            {hasDescription && <AlignLeft className="size-3.5" />}
            {hasDueDate && card.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3.5" />
                {formatDueDate(card.dueDate)}
              </span>
            )}
            {checklistTotal > 0 && (
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="size-3.5" />
                {checklistDone}/{checklistTotal}
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="size-3.5" />
                {attachmentCount}
              </span>
            )}
            {hasMembers && (
              <AvatarGroup size={18} className="ml-auto">
                {card.members.map((member) => (
                  <Avatar key={member.userId} title={member.user.name}>
                    <AvatarImage
                      src={member.user.image || undefined}
                      alt={member.user.name}
                    />
                    <AvatarFallback className="text-[8px]">
                      {initials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
