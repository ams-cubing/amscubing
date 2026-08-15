"use client";

import { Paperclip, Trash2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import type { BoardCard } from "../../_lib/types";

export function CardAttachmentsSection({
  card,
  showAttachmentForm,
  attachmentName,
  attachmentUrl,
  pending,
  attachmentUrlRef,
  onNameChange,
  onUrlChange,
  onHideForm,
  onRemove,
  onAdd,
}: {
  card: BoardCard;
  showAttachmentForm: boolean;
  attachmentName: string;
  attachmentUrl: string;
  pending: boolean;
  attachmentUrlRef: React.RefObject<HTMLInputElement | null>;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onHideForm: () => void;
  onRemove: (attachmentId: number) => void;
  onAdd: () => void;
}) {
  return (
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
              aria-label={`Eliminar adjunto ${attachment.name}`}
              onClick={() => onRemove(attachment.id)}
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
            <Button type="submit" size="sm" disabled={pending}>
              Añadir adjunto
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onHideForm}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
