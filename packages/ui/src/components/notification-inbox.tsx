"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell } from "lucide-react";
import * as React from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

export type NotificationInboxItem = {
  id: number;
  title: string;
  href: string;
  readAt: string | null;
  createdAt: string;
  actorName?: string | null;
  actorImage?: string | null;
};

export function NotificationInbox({
  items: initialItems,
  unreadCount: initialUnreadCount,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  refreshIntervalMs = 45_000,
}: {
  items: NotificationInboxItem[];
  unreadCount: number;
  onMarkRead: (id: number) => Promise<void> | void;
  onMarkAllRead: () => Promise<void> | void;
  onRefresh?: () => Promise<{
    items: NotificationInboxItem[];
    unreadCount: number;
  }>;
  refreshIntervalMs?: number;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setItems(initialItems);
    setUnreadCount(initialUnreadCount);
  }, [initialItems, initialUnreadCount]);

  React.useEffect(() => {
    if (!onRefresh) return;

    const id = window.setInterval(() => {
      void onRefresh()
        .then((data) => {
          setItems(data.items);
          setUnreadCount(data.unreadCount);
        })
        .catch(() => {
          // Keep the last successful snapshot if a refresh fails.
        });
    }, refreshIntervalMs);

    return () => window.clearInterval(id);
  }, [onRefresh, refreshIntervalMs]);

  const badge =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  async function handleMarkAll() {
    if (unreadCount === 0 || pending) return;
    setPending(true);
    try {
      await onMarkAllRead();
      setUnreadCount(0);
      setItems((current) =>
        current.map((item) =>
          item.readAt ? item : { ...item, readAt: new Date().toISOString() },
        ),
      );
    } finally {
      setPending(false);
    }
  }

  async function handleOpenItem(item: NotificationInboxItem) {
    if (!item.readAt) {
      setUnreadCount((count) => Math.max(0, count - 1));
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, readAt: new Date().toISOString() }
            : row,
        ),
      );
      void onMarkRead(item.id);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notificaciones, ${unreadCount} sin leer`
              : "Notificaciones"
          }
        >
          <Bell />
          {badge ? (
            <span className="bg-destructive text-white absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium">
              {badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-medium">Notificaciones</p>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              disabled={pending}
              onClick={() => void handleMarkAll()}
            >
              Marcar todas como leídas
            </Button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-8 text-center text-sm">
            No hay notificaciones
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => {
              const unread = !item.readAt;
              return (
                <li key={item.id} className="border-b last:border-b-0">
                  <a
                    href={item.href}
                    className={cn(
                      "hover:bg-accent flex gap-2 px-3 py-2.5 text-left transition-colors",
                      unread && "bg-accent/40",
                    )}
                    onClick={() => void handleOpenItem(item)}
                  >
                    {unread ? (
                      <span
                        className="bg-primary mt-1.5 size-2 shrink-0 rounded-full"
                        aria-hidden
                      />
                    ) : (
                      <span className="mt-1.5 size-2 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
