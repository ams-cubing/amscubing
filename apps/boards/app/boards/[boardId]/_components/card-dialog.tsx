"use client";

import {
  CalendarClock,
  CheckSquare,
  ChevronDown,
  MessageSquare,
  Paperclip,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import * as React from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { AvatarGroup } from "@workspace/ui/components/avatar-group";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import {
  addAttachmentAction,
  addCardCommentAction,
  addChecklistAction,
  addChecklistItemAction,
  deleteCardCommentAction,
  moveCardAction,
  removeAttachmentAction,
  toggleCardLabelAction,
  toggleCardMemberAction,
  toggleChecklistItemAction,
  updateCardAction,
} from "../_actions/board-actions";
import type { BoardCard, BoardDetail } from "../_lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function dueDateInputValue(dueDate: Date | string | null | undefined) {
  if (!dueDate) return "";
  const date = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(dueDate: Date | string) {
  const date = dueDate instanceof Date ? dueDate : new Date(dueDate);
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCommentTime(createdAt: Date | string) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return date.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TeamPerson = {
  userId: string;
  wcaId: string;
  name: string;
  image: string | null;
  isPrimary: boolean;
};

function getCompetitionTeam(board: BoardDetail): TeamPerson[] {
  if (!board.competition) return [];
  const byUserId = new Map<string, TeamPerson>();

  for (const row of board.competition.delegates) {
    if (!row.delegate) continue;
    byUserId.set(row.delegate.id, {
      userId: row.delegate.id,
      wcaId: row.delegate.wcaId,
      name: row.delegate.name,
      image: row.delegate.image,
      isPrimary: row.isPrimary,
    });
  }
  for (const row of board.competition.organizers) {
    if (!row.organizer) continue;
    const existing = byUserId.get(row.organizer.id);
    byUserId.set(row.organizer.id, {
      userId: row.organizer.id,
      wcaId: row.organizer.wcaId,
      name: row.organizer.name,
      image: row.organizer.image,
      isPrimary: existing?.isPrimary || row.isPrimary,
    });
  }

  return [...byUserId.values()].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
}

export function CardDialog({
  board,
  card,
  open,
  onOpenChange,
}: {
  board: BoardDetail;
  card: BoardCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = React.useState(card?.title ?? "");
  const [description, setDescription] = React.useState(card?.description ?? "");
  const [editingDescription, setEditingDescription] = React.useState(false);
  const [showFullDescription, setShowFullDescription] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [newItem, setNewItem] = React.useState<Record<number, string>>({});
  const [attachmentName, setAttachmentName] = React.useState("");
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const [checklistTitle, setChecklistTitle] = React.useState("");
  const [commentBody, setCommentBody] = React.useState("");
  const [showDates, setShowDates] = React.useState(false);
  const [showChecklistForm, setShowChecklistForm] = React.useState(false);
  const [showMembers, setShowMembers] = React.useState(false);
  const [showAttachmentForm, setShowAttachmentForm] = React.useState(false);
  const [dueDate, setDueDate] = React.useState(
    dueDateInputValue(card?.dueDate),
  );

  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
  const checklistInputRef = React.useRef<HTMLInputElement>(null);
  const attachmentUrlRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTitle(card?.title ?? "");
    setDescription(card?.description ?? "");
    setDueDate(dueDateInputValue(card?.dueDate));
    setEditingDescription(false);
    setShowFullDescription(false);
    setNewItem({});
    setAttachmentName("");
    setAttachmentUrl("");
    setChecklistTitle("");
    setCommentBody("");
    setShowDates(false);
    setShowChecklistForm(false);
    setShowMembers(false);
    setShowAttachmentForm(false);
  }, [card]);

  if (!card) return null;

  const labelIds = new Set(card.cardLabels.map((cl) => cl.labelId));
  const memberIds = new Set(card.members.map((m) => m.userId));
  const currentList = board.lists.find((list) => list.id === card.listId);
  const team = getCompetitionTeam(board);
  const descriptionLong = (description || card.description || "").length > 280;
  const visibleDescription =
    !editingDescription && descriptionLong && !showFullDescription
      ? `${(description || card.description || "").slice(0, 280)}…`
      : description || card.description || "";

  function persistTitle() {
    if (title.trim() && title !== card!.title) {
      startTransition(async () => {
        await updateCardAction({
          boardId: board.id,
          cardId: card!.id,
          title: title.trim(),
        });
      });
    }
  }

  function persistDescription() {
    const next = description.trim() || null;
    if (next !== (card!.description ?? null)) {
      startTransition(async () => {
        await updateCardAction({
          boardId: board.id,
          cardId: card!.id,
          description: next,
        });
      });
    }
    setEditingDescription(false);
  }

  function persistDueDate(value: string) {
    setDueDate(value);
    startTransition(async () => {
      await updateCardAction({
        boardId: board.id,
        cardId: card!.id,
        dueDate: value || null,
      });
    });
  }

  async function moveToList(toListId: number) {
    if (toListId === card!.listId) return;
    const targetList = board.lists.find((list) => list.id === toListId);
    if (!targetList) return;
    const ordered = [...targetList.cards.map((c) => c.id), card!.id];
    startTransition(async () => {
      await moveCardAction({
        boardId: board.id,
        cardId: card!.id,
        toListId,
        toPosition: ordered.length - 1,
        orderedCardIdsInTargetList: ordered,
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="secondary" size="sm">
                  {currentList?.title ?? "Lista"}
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {board.lists.map((list) => (
                  <DropdownMenuItem
                    key={list.id}
                    onClick={() => void moveToList(list.id)}
                    disabled={list.id === card.listId || pending}
                  >
                    {list.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogTitle className="sr-only">{card.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Detalle de la tarjeta
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.85fr)]">
          <div className="min-h-0 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={persistTitle}
                className="h-auto border-transparent bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
                disabled={pending}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowDates(true);
                  }}
                >
                  <CalendarClock className="size-4" />
                  Fechas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowChecklistForm(true);
                    requestAnimationFrame(() =>
                      checklistInputRef.current?.focus(),
                    );
                  }}
                >
                  <CheckSquare className="size-4" />
                  Checklist
                </Button>
                {team.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowMembers((v) => !v)}
                  >
                    <UserPlus className="size-4" />
                    Miembros
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowAttachmentForm(true);
                    requestAnimationFrame(() =>
                      attachmentUrlRef.current?.focus(),
                    );
                  }}
                >
                  <Paperclip className="size-4" />
                  Adjunto
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex flex-wrap gap-2">
                {board.labels.map((label) => {
                  const checked = labelIds.has(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium text-white transition",
                        checked
                          ? "ring-2 ring-offset-2 ring-offset-background"
                          : "opacity-60",
                      )}
                      style={{ backgroundColor: label.color }}
                      onClick={() => {
                        startTransition(async () => {
                          await toggleCardLabelAction({
                            boardId: board.id,
                            cardId: card.id,
                            labelId: label.id,
                            checked: !checked,
                          });
                        });
                      }}
                    >
                      {label.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {(showDates || card.dueDate) && (
              <div className="space-y-2">
                <Label htmlFor="card-due-date">Fecha de vencimiento</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="card-due-date"
                    type="date"
                    className="w-auto"
                    value={dueDate}
                    onChange={(e) => persistDueDate(e.target.value)}
                    disabled={pending}
                  />
                  {dueDate && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => persistDueDate("")}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {(showMembers || card.members.length > 0) && team.length > 0 && (
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
                        <AvatarFallback>
                          {initials(member.user.name)}
                        </AvatarFallback>
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
                        onClick={() => {
                          startTransition(async () => {
                            await toggleCardMemberAction({
                              boardId: board.id,
                              cardId: card.id,
                              userId: person.userId,
                              checked: !checked,
                            });
                          });
                        }}
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
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Descripción</Label>
                {!editingDescription && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingDescription(true);
                      requestAnimationFrame(() =>
                        descriptionRef.current?.focus(),
                      );
                    }}
                  >
                    Editar
                  </Button>
                )}
              </div>
              {editingDescription ? (
                <Textarea
                  ref={descriptionRef}
                  value={description}
                  rows={8}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={persistDescription}
                  disabled={pending}
                />
              ) : (
                <div className="space-y-2">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {visibleDescription || "Sin descripción"}
                  </p>
                  {descriptionLong && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowFullDescription((v) => !v)}
                    >
                      {showFullDescription ? "Mostrar menos" : "Mostrar más"}
                      <ChevronDown
                        className={cn(
                          "size-4 transition",
                          showFullDescription && "rotate-180",
                        )}
                      />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Checklists</Label>
                {showChecklistForm ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      startTransition(async () => {
                        await addChecklistAction({
                          boardId: board.id,
                          cardId: card.id,
                          title: checklistTitle || "Checklist",
                        });
                        setChecklistTitle("");
                        setShowChecklistForm(false);
                      });
                    }}
                  >
                    <Input
                      ref={checklistInputRef}
                      className="h-8 w-36"
                      placeholder="Nueva checklist"
                      value={checklistTitle}
                      onChange={(e) => setChecklistTitle(e.target.value)}
                    />
                    <Button type="submit" size="sm" variant="outline">
                      <Plus className="size-4" />
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowChecklistForm(true);
                      requestAnimationFrame(() =>
                        checklistInputRef.current?.focus(),
                      );
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
              </div>

              {card.checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div className="text-sm font-medium">{checklist.title}</div>
                  <ul className="space-y-2">
                    {checklist.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <Checkbox
                          checked={item.done}
                          onCheckedChange={(checked) => {
                            startTransition(async () => {
                              await toggleChecklistItemAction({
                                boardId: board.id,
                                itemId: item.id,
                                done: Boolean(checked),
                              });
                            });
                          }}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            item.done && "text-muted-foreground line-through",
                          )}
                        >
                          {item.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const value = newItem[checklist.id]?.trim();
                      if (!value) return;
                      startTransition(async () => {
                        await addChecklistItemAction({
                          boardId: board.id,
                          checklistId: checklist.id,
                          title: value,
                        });
                        setNewItem((prev) => ({ ...prev, [checklist.id]: "" }));
                      });
                    }}
                  >
                    <Input
                      className="h-8"
                      placeholder="Añadir ítem"
                      value={newItem[checklist.id] ?? ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          [checklist.id]: e.target.value,
                        }))
                      }
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Añadir
                    </Button>
                  </form>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Label className="inline-flex items-center gap-2">
                <Paperclip className="size-4" />
                Adjuntos (URL)
              </Label>
              <ul className="space-y-2">
                {card.attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate underline-offset-2 hover:underline"
                    >
                      {attachment.name}
                    </a>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        startTransition(async () => {
                          await removeAttachmentAction({
                            boardId: board.id,
                            attachmentId: attachment.id,
                          });
                        });
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              {showAttachmentForm && (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!attachmentUrl.trim()) return;
                    startTransition(async () => {
                      await addAttachmentAction({
                        boardId: board.id,
                        cardId: card.id,
                        name: attachmentName,
                        url: attachmentUrl,
                      });
                      setAttachmentName("");
                      setAttachmentUrl("");
                      setShowAttachmentForm(false);
                    });
                  }}
                >
                  <Input
                    placeholder="Nombre"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                  />
                  <Input
                    ref={attachmentUrlRef}
                    placeholder="https://..."
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    required
                  />
                  <Button type="submit" size="sm" disabled={pending}>
                    Añadir adjunto
                  </Button>
                </form>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col border-t bg-muted/20 lg:border-t-0 lg:border-l">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <MessageSquare className="size-4" />
              <h3 className="text-sm font-medium">Comentarios y actividad</h3>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {card.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay comentarios.
                </p>
              ) : (
                card.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage
                        src={comment.author.image || undefined}
                        alt={comment.author.name}
                      />
                      <AvatarFallback>
                        {initials(comment.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCommentTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap rounded-md border bg-background px-3 py-2 text-sm">
                        {comment.body}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => {
                          startTransition(async () => {
                            await deleteCardCommentAction({
                              boardId: board.id,
                              commentId: comment.id,
                            });
                          });
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form
              className="shrink-0 border-t p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentBody.trim()) return;
                startTransition(async () => {
                  await addCardCommentAction({
                    boardId: board.id,
                    cardId: card.id,
                    body: commentBody,
                  });
                  setCommentBody("");
                });
              }}
            >
              <Textarea
                placeholder="Escribe un comentario..."
                value={commentBody}
                rows={3}
                onChange={(e) => setCommentBody(e.target.value)}
                disabled={pending}
              />
              <Button
                type="submit"
                size="sm"
                className="mt-2"
                disabled={pending || !commentBody.trim()}
              >
                Comentar
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { formatDueDate };
