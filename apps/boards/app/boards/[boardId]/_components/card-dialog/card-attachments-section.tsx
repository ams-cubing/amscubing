"use client";

import { Ellipsis, Link2, Paperclip, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { useUploadThing } from "@/lib/uploadthing-client";

import type { BoardCard } from "../../_lib/types";

type Attachment = BoardCard["attachments"][number];

function AttachmentEditForm({
  attachment,
  pending,
  onCancel,
  onSave,
}: {
  attachment: Attachment;
  pending: boolean;
  onCancel: () => void;
  onSave: (name: string, url: string) => void;
}) {
  const [name, setName] = React.useState(attachment.name);
  const [url, setUrl] = React.useState(attachment.url);

  return (
    <form
      className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!url.trim()) return;
        onSave(name, url);
      }}
    >
      <Input
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function AttachmentRow({
  attachment,
  pending,
  readOnly,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onRemove,
}: {
  attachment: Attachment;
  pending: boolean;
  readOnly: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (name: string, url: string) => void;
  onRemove: () => void;
}) {
  if (editing) {
    return (
      <AttachmentEditForm
        attachment={attachment}
        pending={pending}
        onCancel={onCancelEdit}
        onSave={onSave}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <Link2 className="size-4 shrink-0 text-emerald-500" />
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
      >
        {attachment.name}
      </a>
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              aria-label={`Opciones de ${attachment.name}`}
            >
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onRemove}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function CardAttachmentsSection({
  boardId,
  card,
  showAttachmentForm,
  attachmentName,
  attachmentUrl,
  pending,
  readOnly = false,
  attachmentUrlRef,
  onNameChange,
  onUrlChange,
  onHideForm,
  onShowForm,
  onRemove,
  onAdd,
  onUpdate,
}: {
  boardId: number;
  card: BoardCard;
  showAttachmentForm: boolean;
  attachmentName: string;
  attachmentUrl: string;
  pending: boolean;
  readOnly?: boolean;
  attachmentUrlRef: React.RefObject<HTMLInputElement | null>;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onHideForm: () => void;
  onShowForm: () => void;
  onRemove: (attachmentId: number) => void;
  onAdd: () => void;
  onUpdate: (attachmentId: number, name: string, url: string) => void;
}) {
  const router = useRouter();
  const [editingAttachmentId, setEditingAttachmentId] = React.useState<
    number | null
  >(null);

  React.useEffect(() => {
    setEditingAttachmentId(null);
  }, [card.id]);

  const { startUpload, isUploading } = useUploadThing("cardAttachment", {
    onClientUploadComplete: () => {
      toast.success("Archivo(s) subido(s)");
      router.refresh();
    },
    onUploadError: (error) => {
      toast.error(error.message || "Error al subir el archivo");
    },
  });

  const hasAttachments = card.attachments.length > 0;
  const busy = pending || isUploading;

  if (!hasAttachments && !showAttachmentForm && readOnly) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="inline-flex items-center gap-2">
          <Paperclip className="size-4" />
          Adjuntos
        </Label>
        {!readOnly && !showAttachmentForm && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*,application/pdf";
                input.multiple = true;
                input.onchange = async () => {
                  const files = input.files ? Array.from(input.files) : [];
                  if (files.length === 0) return;
                  await startUpload(files.slice(0, 4), {
                    boardId,
                    cardId: card.id,
                  });
                };
                input.click();
              }}
            >
              <Upload className="mr-1 size-3.5" />
              {isUploading ? "Subiendo…" : "Subir archivo"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={onShowForm}
            >
              Añadir enlace
            </Button>
          </div>
        )}
      </div>

      {hasAttachments && (
        <ul className="space-y-2">
          {card.attachments.map((attachment) => (
            <li key={attachment.id}>
              <AttachmentRow
                attachment={attachment}
                pending={busy}
                readOnly={readOnly}
                editing={editingAttachmentId === attachment.id}
                onEdit={() => setEditingAttachmentId(attachment.id)}
                onCancelEdit={() => setEditingAttachmentId(null)}
                onSave={(name, url) => {
                  onUpdate(attachment.id, name, url);
                  setEditingAttachmentId(null);
                }}
                onRemove={() => onRemove(attachment.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {showAttachmentForm && !readOnly && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!attachmentUrl.trim()) return;
            onAdd();
          }}
        >
          <Input
            placeholder="Nombre"
            value={attachmentName}
            onChange={(e) => onNameChange(e.target.value)}
          />
          <Input
            ref={attachmentUrlRef}
            placeholder="https://..."
            value={attachmentUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              Añadir enlace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onHideForm}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
