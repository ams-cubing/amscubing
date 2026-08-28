"use client";

import {
  CalendarClock,
  CheckSquare,
  ChevronDown,
  Paperclip,
  UserPlus,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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

import { runBoardAction } from "@/lib/run-board-action";

import {
  addAttachmentAction,
  addCardCommentAction,
  addChecklistAction,
  addChecklistItemAction,
  createLabelAction,
  deleteCardCommentAction,
  deleteLabelAction,
  moveCardAction,
  removeAttachmentAction,
  toggleCardLabelAction,
  toggleCardMemberAction,
  toggleChecklistItemAction,
  updateCardAction,
  updateLabelAction,
} from "../_actions/board-actions";
import { dueDateInputValue, formatDueDate } from "../_lib/card-format";
import type { BoardCard, BoardDetail } from "../_lib/types";
import { CardLabelsBar } from "./card-dialog/card-labels-bar";
import { CardLabelsPopover } from "./card-dialog/card-labels-popover";
import { CardAttachmentsSection } from "./card-dialog/card-attachments-section";
import { CardChecklistsSection } from "./card-dialog/card-checklists-section";
import { CardCommentsSection } from "./card-dialog/card-comments-section";
import { CardDescriptionSection } from "./card-dialog/card-description-section";
import type { DescriptionEditorHandle } from "./card-dialog/description-editor";
import {
  CardMembersSection,
  type TeamPerson,
} from "./card-dialog/card-members-section";
import { getCompetitionTeam } from "../_lib/team";

export function CardDialog({
  board,
  card,
  open,
  onOpenChange,
  readOnly = false,
}: {
  board: BoardDetail;
  card: BoardCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}) {
  const [title, setTitle] = React.useState(card?.title ?? "");
  const [description, setDescription] = React.useState(card?.description ?? "");
  const [descriptionDraft, setDescriptionDraft] = React.useState(
    card?.description ?? "",
  );
  const [editingDescription, setEditingDescription] = React.useState(false);
  const [showFullDescription, setShowFullDescription] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [newItem, setNewItem] = React.useState<Record<number, string>>({});
  const [attachmentName, setAttachmentName] = React.useState("");
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const [checklistTitle, setChecklistTitle] = React.useState("");
  const [commentBody, setCommentBody] = React.useState("");
  const [showDates, setShowDates] = React.useState(false);
  const [labelsOpen, setLabelsOpen] = React.useState(false);
  const [editLabelId, setEditLabelId] = React.useState<number | null>(null);
  const [showChecklistForm, setShowChecklistForm] = React.useState(false);
  const [showMembers, setShowMembers] = React.useState(false);
  const [showAttachmentForm, setShowAttachmentForm] = React.useState(false);
  const [dueDate, setDueDate] = React.useState(
    dueDateInputValue(card?.dueDate),
  );

  const descriptionEditorRef = React.useRef<DescriptionEditorHandle>(null);
  const checklistInputRef = React.useRef<HTMLInputElement>(null);
  const attachmentUrlRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTitle(card?.title ?? "");
    setDescription(card?.description ?? "");
    setDescriptionDraft(card?.description ?? "");
    setDueDate(dueDateInputValue(card?.dueDate));
    setEditingDescription(false);
    setShowFullDescription(false);
    setNewItem({});
    setAttachmentName("");
    setAttachmentUrl("");
    setChecklistTitle("");
    setCommentBody("");
    setShowDates(false);
    setLabelsOpen(false);
    setEditLabelId(null);
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
  const displayDescription = description || card.description || "";
  const canEdit = !readOnly && !pending;

  function run(message: string, action: () => Promise<unknown>) {
    startTransition(async () => {
      await runBoardAction(action, { errorMessage: message });
    });
  }

  function persistTitle() {
    if (readOnly) return;
    if (title.trim() && title !== card!.title) {
      run("No se pudo actualizar el título", () =>
        updateCardAction({
          boardId: board.id,
          cardId: card!.id,
          title: title.trim(),
        }),
      );
    }
  }

  function persistDescription(nextDescription: string) {
    if (readOnly) return;
    const next = nextDescription.trim() || null;
    if (next !== (card!.description ?? null)) {
      run("No se pudo actualizar la descripción", () =>
        updateCardAction({
          boardId: board.id,
          cardId: card!.id,
          description: next,
        }),
      );
    }
    setDescription(next ?? "");
    setEditingDescription(false);
  }

  function saveDescription() {
    const latest =
      descriptionEditorRef.current?.getMarkdown() ?? descriptionDraft;
    setDescriptionDraft(latest);
    persistDescription(latest);
  }

  function cancelDescriptionEdit() {
    const original = card!.description ?? "";
    setDescriptionDraft(original);
    setEditingDescription(false);
  }

  function startDescriptionEdit() {
    setDescriptionDraft(card!.description ?? "");
    setEditingDescription(true);
    requestAnimationFrame(() => descriptionEditorRef.current?.focus());
  }

  function persistDueDate(value: string) {
    if (readOnly) return;
    setDueDate(value);
    run("No se pudo actualizar la fecha", () =>
      updateCardAction({
        boardId: board.id,
        cardId: card!.id,
        dueDate: value || null,
      }),
    );
  }

  function moveToList(toListId: number) {
    if (readOnly) return;
    if (toListId === card!.listId) return;
    const targetList = board.lists.find((list) => list.id === toListId);
    if (!targetList) return;
    const ordered = [...targetList.cards.map((c) => c.id), card!.id];
    run("No se pudo mover la tarjeta", () =>
      moveCardAction({
        boardId: board.id,
        cardId: card!.id,
        toListId,
        toPosition: ordered.length - 1,
        orderedCardIdsInTargetList: ordered,
      }),
    );
  }

  function openLabelsList() {
    setEditLabelId(null);
    setLabelsOpen(true);
  }

  function openLabelEdit(labelId: number) {
    setEditLabelId(labelId);
    setLabelsOpen(true);
  }

  function handleLabelsOpenChange(open: boolean) {
    setLabelsOpen(open);
    if (!open) setEditLabelId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {readOnly ? (
              <Badge variant="secondary">{currentList?.title ?? "Lista"}</Badge>
            ) : (
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
                      onClick={() => moveToList(list.id)}
                      disabled={list.id === card.listId || pending}
                    >
                      {list.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                disabled={!canEdit}
                readOnly={readOnly}
              />

              {!readOnly && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowDates(true)}
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
              )}
            </div>

            <CardLabelsPopover
              board={board}
              labelIds={labelIds}
              readOnly={readOnly}
              pending={pending}
              open={labelsOpen}
              editLabelId={editLabelId}
              onOpenChange={handleLabelsOpenChange}
              onToggle={(labelId, checked) =>
                run("No se pudo actualizar la etiqueta", () =>
                  toggleCardLabelAction({
                    boardId: board.id,
                    cardId: card.id,
                    labelId,
                    checked,
                  }),
                )
              }
              onCreate={(name, color) =>
                run("No se pudo crear la etiqueta", () =>
                  createLabelAction({
                    boardId: board.id,
                    cardId: card.id,
                    name,
                    color,
                  }),
                )
              }
              onUpdate={(labelId, name, color) =>
                run("No se pudo actualizar la etiqueta", () =>
                  updateLabelAction({
                    boardId: board.id,
                    labelId,
                    name,
                    color,
                  }),
                )
              }
              onDelete={(labelId) =>
                run("No se pudo eliminar la etiqueta", () =>
                  deleteLabelAction({
                    boardId: board.id,
                    labelId,
                  }),
                )
              }
            >
              <CardLabelsBar
                card={card}
                readOnly={readOnly}
                onOpenList={openLabelsList}
                onOpenEdit={openLabelEdit}
              />
            </CardLabelsPopover>

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
                    disabled={!canEdit}
                    readOnly={readOnly}
                  />
                  {dueDate && !readOnly && (
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
              <CardMembersSection
                card={card}
                team={team}
                memberIds={memberIds}
                onToggle={(userId, checked) =>
                  run("No se pudo actualizar el miembro", () =>
                    toggleCardMemberAction({
                      boardId: board.id,
                      cardId: card.id,
                      userId,
                      checked,
                    }),
                  )
                }
              />
            )}

            <CardDescriptionSection
              description={displayDescription}
              descriptionDraft={descriptionDraft}
              descriptionLong={descriptionLong}
              showFullDescription={showFullDescription}
              editingDescription={editingDescription}
              pending={pending}
              readOnly={readOnly}
              editorRef={descriptionEditorRef}
              onEdit={startDescriptionEdit}
              onDraftChange={setDescriptionDraft}
              onSave={saveDescription}
              onCancel={cancelDescriptionEdit}
              onToggleFull={() => setShowFullDescription((v) => !v)}
              onOpenAttachments={() => {
                setShowAttachmentForm(true);
                requestAnimationFrame(() => attachmentUrlRef.current?.focus());
              }}
            />

            <CardChecklistsSection
              card={card}
              checklistTitle={checklistTitle}
              showChecklistForm={showChecklistForm}
              newItem={newItem}
              checklistInputRef={checklistInputRef}
              onChecklistTitleChange={setChecklistTitle}
              onShowChecklistForm={setShowChecklistForm}
              onNewItemChange={setNewItem}
              onAddChecklist={() =>
                run("No se pudo crear la checklist", async () => {
                  await addChecklistAction({
                    boardId: board.id,
                    cardId: card.id,
                    title: checklistTitle || "Checklist",
                  });
                  setChecklistTitle("");
                  setShowChecklistForm(false);
                })
              }
              onToggleItem={(itemId, done) =>
                run("No se pudo actualizar el ítem", () =>
                  toggleChecklistItemAction({
                    boardId: board.id,
                    itemId,
                    done,
                  }),
                )
              }
              onAddItem={(checklistId, value) =>
                run("No se pudo añadir el ítem", async () => {
                  await addChecklistItemAction({
                    boardId: board.id,
                    checklistId,
                    title: value,
                  });
                  setNewItem((prev) => ({ ...prev, [checklistId]: "" }));
                })
              }
            />

            <CardAttachmentsSection
              card={card}
              showAttachmentForm={showAttachmentForm}
              attachmentName={attachmentName}
              attachmentUrl={attachmentUrl}
              pending={pending}
              attachmentUrlRef={attachmentUrlRef}
              onNameChange={setAttachmentName}
              onUrlChange={setAttachmentUrl}
              onHideForm={() => setShowAttachmentForm(false)}
              onRemove={(attachmentId) =>
                run("No se pudo eliminar el adjunto", () =>
                  removeAttachmentAction({
                    boardId: board.id,
                    attachmentId,
                  }),
                )
              }
              onAdd={() =>
                run("No se pudo añadir el adjunto", async () => {
                  await addAttachmentAction({
                    boardId: board.id,
                    cardId: card.id,
                    name: attachmentName,
                    url: attachmentUrl,
                  });
                  setAttachmentName("");
                  setAttachmentUrl("");
                  setShowAttachmentForm(false);
                })
              }
            />
          </div>

          <CardCommentsSection
            card={card}
            team={team}
            commentBody={commentBody}
            pending={pending}
            onCommentBodyChange={setCommentBody}
            onDelete={(commentId) =>
              run("No se pudo eliminar el comentario", () =>
                deleteCardCommentAction({
                  boardId: board.id,
                  commentId,
                }),
              )
            }
            onAdd={() =>
              run("No se pudo publicar el comentario", async () => {
                await addCardCommentAction({
                  boardId: board.id,
                  cardId: card.id,
                  body: commentBody,
                });
                setCommentBody("");
              })
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { formatDueDate };
