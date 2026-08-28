"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import {
  DescriptionEditorField,
  type DescriptionEditorHandle,
} from "./description-editor";
import { MarkdownContent } from "./markdown-content";

export function CardDescriptionSection({
  description,
  descriptionDraft,
  descriptionLong,
  showFullDescription,
  editingDescription,
  pending,
  readOnly,
  editorRef,
  onEdit,
  onDraftChange,
  onSave,
  onCancel,
  onToggleFull,
  onOpenAttachments,
}: {
  description: string;
  descriptionDraft: string;
  descriptionLong: boolean;
  showFullDescription: boolean;
  editingDescription: boolean;
  pending: boolean;
  readOnly?: boolean;
  editorRef: React.RefObject<DescriptionEditorHandle | null>;
  onEdit: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleFull: () => void;
  onOpenAttachments?: () => void;
}) {
  const [markdownMode, setMarkdownMode] = React.useState(false);
  const hasDescription = Boolean(description.trim());

  React.useEffect(() => {
    if (!editingDescription) {
      setMarkdownMode(false);
    }
  }, [editingDescription]);

  function handleSave() {
    onSave();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Descripción</Label>
        {!editingDescription && !readOnly && (
          <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
        )}
      </div>
      {editingDescription ? (
        <div className="space-y-3">
          <DescriptionEditorField
            ref={editorRef}
            value={descriptionDraft}
            onChange={onDraftChange}
            disabled={pending}
            markdownMode={markdownMode}
            onMarkdownModeChange={setMarkdownMode}
            onOpenAttachments={onOpenAttachments}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={pending}
            >
              Guardar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {hasDescription ? (
            <div
              className={cn(
                descriptionLong &&
                  !showFullDescription &&
                  "max-h-36 overflow-hidden",
              )}
            >
              <MarkdownContent content={description} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin descripción</p>
          )}
          {descriptionLong && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onToggleFull}
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
  );
}
