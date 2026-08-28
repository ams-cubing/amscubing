import type * as React from "react";

import * as MentionPrimitive from "@diceui/mention";

import { cn } from "@workspace/ui/lib/utils";

function Mention({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Root>) {
  return (
    <MentionPrimitive.Root
      data-slot="mention"
      className={cn(
        "**:data-tag:rounded **:data-tag:bg-primary/10 **:data-tag:px-1 **:data-tag:py-px **:data-tag:font-medium **:data-tag:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function MentionLabel({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Label>) {
  return (
    <MentionPrimitive.Label
      data-slot="mention-label"
      className={cn("px-0.5 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  );
}

function MentionInput({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Input>) {
  return (
    <MentionPrimitive.Input
      data-slot="mention-input"
      className={cn(
        "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function MentionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Content>) {
  return (
    <MentionPrimitive.Portal>
      <MentionPrimitive.Content
        data-slot="mention-content"
        className={cn(
          "relative z-50 max-h-48 min-w-32 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
      </MentionPrimitive.Content>
    </MentionPrimitive.Portal>
  );
}

function MentionItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Item>) {
  return (
    <MentionPrimitive.Item
      data-slot="mention-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </MentionPrimitive.Item>
  );
}

export { Mention, MentionContent, MentionInput, MentionItem, MentionLabel };
