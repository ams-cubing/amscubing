"use client";

import { Check, ChevronLeft, Pencil, X } from "lucide-react";
import * as React from "react";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

import type { BoardDetail, BoardLabel } from "../../_lib/types";
import { DEFAULT_LABEL_COLOR, LABEL_COLORS } from "./label-colors";

type PopoverView = "list" | "create" | "edit";

function stopScrollPropagation(e: React.WheelEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  if (el.scrollHeight > el.clientHeight) {
    e.stopPropagation();
  }
}

function PopoverScrollArea({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("min-h-0 overflow-y-auto overscroll-contain touch-pan-y", className)}
      onWheel={stopScrollPropagation}
    >
      {children}
    </div>
  );
}

function isColorSelected(color: string, value: string) {
  return color.toLowerCase() === value.toLowerCase();
}

function ColorSwatches({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LABEL_COLORS.map((swatch) => {
        const selected = isColorSelected(swatch, value);
        return (
          <button
            key={swatch}
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-8 w-full items-center justify-center rounded-md transition hover:opacity-90",
              selected && "ring-2 ring-primary ring-offset-2 ring-offset-popover",
            )}
            style={{ backgroundColor: swatch }}
            aria-label={`Color ${swatch}`}
            aria-pressed={selected}
            onClick={() => onChange(swatch)}
          >
            {selected && (
              <Check className="size-4 text-white drop-shadow-sm" strokeWidth={3} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function LabelEditor({
  name,
  color,
  pending,
  onNameChange,
  onColorChange,
}: {
  name: string;
  color: string;
  pending: boolean;
  onNameChange: (value: string) => void;
  onColorChange: (color: string) => void;
}) {
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex h-10 w-full items-center justify-center rounded-md px-3",
          "text-sm font-semibold text-white",
        )}
        style={{ backgroundColor: color }}
      >
        <span className="truncate">{name.trim() || "Etiqueta"}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label-name" className="text-xs text-muted-foreground">
          Título
        </Label>
        <Input
          id="label-name"
          ref={nameInputRef}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={pending}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Seleccionar un color
        </Label>
        <ColorSwatches
          value={color}
          onChange={onColorChange}
          disabled={pending}
        />
      </div>
    </div>
  );
}

function LabelEditorFooter({
  mode,
  pending,
  canSave,
  hasCustomColor,
  onRemoveColor,
  onSave,
  onDelete,
}: {
  mode: "create" | "edit";
  pending: boolean;
  canSave: boolean;
  hasCustomColor: boolean;
  onRemoveColor: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending || !hasCustomColor}
        onClick={onRemoveColor}
      >
        <X className="size-4" />
        Quitar color
      </Button>
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1"
          disabled={pending || !canSave}
          onClick={onSave}
        >
          {mode === "create" ? "Crear" : "Guardar"}
        </Button>
        {mode === "edit" && onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            disabled={pending}
            onClick={onDelete}
          >
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}

export function CardLabelsPopover({
  board,
  labelIds,
  readOnly,
  pending,
  open,
  onOpenChange,
  editLabelId = null,
  children,
  onToggle,
  onCreate,
  onUpdate,
  onDelete,
}: {
  board: BoardDetail;
  labelIds: Set<number>;
  readOnly: boolean;
  pending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLabelId?: number | null;
  children: React.ReactNode;
  onToggle: (labelId: number, checked: boolean) => void;
  onCreate: (name: string, color: string) => void;
  onUpdate: (labelId: number, name: string, color: string) => void;
  onDelete: (labelId: number) => void;
}) {
  const [view, setView] = React.useState<PopoverView>("list");
  const [search, setSearch] = React.useState("");
  const [editingLabel, setEditingLabel] = React.useState<BoardLabel | null>(
    null,
  );
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<string>(DEFAULT_LABEL_COLOR);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  function resetState() {
    setView("list");
    setSearch("");
    setEditingLabel(null);
    setName("");
    setColor(DEFAULT_LABEL_COLOR);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  function openCreate() {
    setName(search.trim());
    setColor(LABEL_COLORS[16]);
    setEditingLabel(null);
    setView("create");
  }

  function openEdit(label: BoardLabel) {
    setEditingLabel(label);
    setName(label.name);
    setColor(label.color);
    setView("edit");
  }

  React.useEffect(() => {
    if (!open) return;

    if (editLabelId != null) {
      const label = board.labels.find((item) => item.id === editLabelId);
      if (label) openEdit(label);
      return;
    }

    setView("list");
    setEditingLabel(null);
    setName("");
    setColor(DEFAULT_LABEL_COLOR);
    setSearch("");
  }, [open, editLabelId]);

  React.useEffect(() => {
    if (open && view === "list") {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, view]);

  const filteredLabels = board.labels.filter((label) =>
    label.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const headerTitle =
    view === "create"
      ? "Crear etiqueta"
      : view === "edit"
        ? "Editar etiqueta"
        : "Etiquetas";

  const hasCustomColor = !isColorSelected(color, DEFAULT_LABEL_COLOR);

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverAnchor asChild>
        <div>{children}</div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className={cn(
          "z-60 flex w-[min(19rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0",
          "max-h-[min(420px,var(--radix-popover-content-available-height))]",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative shrink-0 border-b px-3 py-3">
          {view !== "list" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 left-1 size-8"
              disabled={pending}
              onClick={() => setView("list")}
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
          <p className="text-center text-sm font-semibold">{headerTitle}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-1 size-8"
            onClick={() => handleOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === "list" ? (
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
            )}
          >
            <div className="shrink-0 p-3 pb-2">
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar etiquetas..."
                className="h-9"
                disabled={pending}
              />
            </div>

            <PopoverScrollArea className="min-h-0 flex-1 px-3">
              <div className="space-y-2 pb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Etiquetas
                </p>
                {filteredLabels.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    {search.trim()
                      ? "No hay etiquetas que coincidan"
                      : "Sin etiquetas en el tablero"}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {filteredLabels.map((label) => {
                      const checked = labelIds.has(label.id);
                      return (
                        <li
                          key={label.id}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={readOnly || pending}
                            onCheckedChange={(value) => {
                              if (readOnly) return;
                              onToggle(label.id, value === true);
                            }}
                            aria-label={`Etiqueta ${label.name}`}
                          />
                          <button
                            type="button"
                            disabled={readOnly || pending}
                            className={cn(
                              "flex h-8 min-w-0 flex-1 items-center justify-center rounded-md px-3",
                              "text-sm font-semibold text-white transition hover:brightness-110",
                              (readOnly || pending) && "cursor-default",
                            )}
                            style={{ backgroundColor: label.color }}
                            onClick={() => {
                              if (readOnly) return;
                              onToggle(label.id, !checked);
                            }}
                          >
                            <span className="truncate">{label.name}</span>
                          </button>
                          {!readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0"
                              disabled={pending}
                              onClick={() => openEdit(label)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </PopoverScrollArea>

            {!readOnly && (
              <div className="shrink-0 border-t bg-popover p-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={pending}
                  onClick={openCreate}
                >
                  Crear etiqueta
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PopoverScrollArea className="min-h-0 flex-1 p-3">
              <LabelEditor
                name={name}
                color={color}
                pending={pending}
                onNameChange={setName}
                onColorChange={setColor}
              />
            </PopoverScrollArea>
            <div className="shrink-0 border-t bg-popover p-3">
              <LabelEditorFooter
                mode={view === "create" ? "create" : "edit"}
                pending={pending}
                canSave={Boolean(name.trim())}
                hasCustomColor={hasCustomColor}
                onRemoveColor={() => setColor(DEFAULT_LABEL_COLOR)}
                onSave={() => {
                  const trimmed = name.trim();
                  if (!trimmed) return;
                  if (view === "create") {
                    onCreate(trimmed, color);
                    setView("list");
                    setName("");
                    setColor(DEFAULT_LABEL_COLOR);
                    return;
                  }
                  if (!editingLabel) return;
                  onUpdate(editingLabel.id, trimmed, color);
                  setView("list");
                  setEditingLabel(null);
                }}
                onDelete={
                  editingLabel
                    ? () => {
                        onDelete(editingLabel.id);
                        setView("list");
                        setEditingLabel(null);
                      }
                    : undefined
                }
              />
            </div>
          </div>
        )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
