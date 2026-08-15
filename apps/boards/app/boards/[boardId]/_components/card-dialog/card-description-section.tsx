"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

export function CardDescriptionSection({
  description,
  visibleDescription,
  descriptionLong,
  showFullDescription,
  editingDescription,
  pending,
  descriptionRef,
  onEdit,
  onChange,
  onBlur,
  onToggleFull,
}: {
  description: string;
  visibleDescription: string;
  descriptionLong: boolean;
  showFullDescription: boolean;
  editingDescription: boolean;
  pending: boolean;
  descriptionRef: React.RefObject<HTMLTextAreaElement | null>;
  onEdit: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  onToggleFull: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Descripción</Label>
        {!editingDescription && (
          <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
        )}
      </div>
      {editingDescription ? (
        <Textarea
          ref={descriptionRef}
          value={description}
          rows={8}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
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
