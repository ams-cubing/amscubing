"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  ChevronDown,
  CircleHelp,
  Ellipsis,
  FileCode,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Strikethrough,
  Type,
} from "lucide-react";
import * as React from "react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { DescriptionMarkdownHelp } from "./description-markdown-help";

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("size-8 shrink-0", active && "bg-accent text-accent-foreground")}
          disabled={disabled}
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function LinkPopover({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");

  function applyLink() {
    const href = url.trim();
    if (!href) return;

    const label = text.trim();
    if (label) {
      editor
        .chain()
        .focus()
        .insertContent(`[${label}](${href})`, { contentType: "markdown" })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }

    setOpen(false);
    setUrl("");
    setText("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const previous = editor.getAttributes("link").href as string | undefined;
          setUrl(previous ?? "");
          setText("");
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn(
                "size-8 shrink-0",
                editor.isActive("link") && "bg-accent text-accent-foreground",
              )}
              disabled={disabled}
              aria-label="Enlace"
            >
              <Link className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Enlace</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 space-y-3" align="start">
        <div className="space-y-1.5">
          <Label htmlFor="description-link-url">URL</Label>
          <Input
            id="description-link-url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description-link-text">Texto (opcional)</Label>
          <Input
            id="description-link-text"
            placeholder="Texto visible"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={applyLink} disabled={!url.trim()}>
            Aplicar
          </Button>
          {editor.isActive("link") && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setOpen(false);
              }}
            >
              Quitar
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ImagePopover({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [alt, setAlt] = React.useState("");

  function applyImage() {
    const src = url.trim();
    if (!src) return;
    editor
      .chain()
      .focus()
      .setImage({ src, alt: alt.trim() || undefined })
      .run();
    setOpen(false);
    setUrl("");
    setAlt("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              disabled={disabled}
              aria-label="Imagen"
            >
              <Image className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Imagen</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 space-y-3" align="start">
        <div className="space-y-1.5">
          <Label htmlFor="description-image-url">URL de la imagen</Label>
          <Input
            id="description-image-url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyImage();
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description-image-alt">Texto alternativo (opcional)</Label>
          <Input
            id="description-image-alt"
            placeholder="Descripción"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyImage();
              }
            }}
          />
        </div>
        <Button type="button" size="sm" onClick={applyImage} disabled={!url.trim()}>
          Insertar
        </Button>
      </PopoverContent>
    </Popover>
  );
}

const headingLabels: Record<1 | 2 | 3, string> = {
  1: "Encabezado 1",
  2: "Encabezado 2",
  3: "Encabezado 3",
};

function currentHeadingLabel(editor: Editor) {
  for (const level of [1, 2, 3] as const) {
    if (editor.isActive("heading", { level })) {
      return headingLabels[level];
    }
  }
  return "Texto normal";
}

export function DescriptionToolbar({
  editor,
  disabled,
  markdownMode,
  onMarkdownModeChange,
  onOpenAttachments,
}: {
  editor: Editor | null;
  disabled?: boolean;
  markdownMode: boolean;
  onMarkdownModeChange: (value: boolean) => void;
  onOpenAttachments?: () => void;
}) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border bg-muted/30 px-1 py-1">
      {!markdownMode && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 px-2 text-xs"
                disabled={disabled}
              >
                <Type className="size-4" />
                <span className="hidden max-w-24 truncate sm:inline">
                  {currentHeadingLabel(editor)}
                </span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setParagraph().run()}
              >
                Texto normal
              </DropdownMenuItem>
              {([1, 2, 3] as const).map((level) => (
                <DropdownMenuItem
                  key={level}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level }).run()
                  }
                >
                  {headingLabels[level]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolbarButton
            label="Negrita"
            active={editor.isActive("bold")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Cursiva"
            active={editor.isActive("italic")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                disabled={disabled}
                aria-label="Más formato"
              >
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className="size-4" />
                Tachado
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleCode().run()}
              >
                <FileCode className="size-4" />
                Código en línea
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote className="size-4" />
                Cita
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
              >
                <Minus className="size-4" />
                Línea horizontal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-0.5 h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "size-8 shrink-0",
                  (editor.isActive("bulletList") ||
                    editor.isActive("orderedList")) &&
                    "bg-accent text-accent-foreground",
                )}
                disabled={disabled}
                aria-label="Listas"
              >
                <List className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="size-4" />
                Lista con viñetas
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="size-4" />
                Lista numerada
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-0.5 h-6" />

          <LinkPopover editor={editor} disabled={disabled} />
          <ImagePopover editor={editor} disabled={disabled} />
        </>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        {onOpenAttachments && (
          <ToolbarButton
            label="Adjunto"
            disabled={disabled}
            onClick={onOpenAttachments}
          >
            <Paperclip className="size-4" />
          </ToolbarButton>
        )}

        <ToolbarButton
          label={markdownMode ? "Modo visual" : "Modo Markdown"}
          active={markdownMode}
          disabled={disabled}
          onClick={() => onMarkdownModeChange(!markdownMode)}
        >
          <FileCode className="size-4" />
        </ToolbarButton>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  aria-label="Ayuda de Markdown"
                >
                  <CircleHelp className="size-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Ayuda</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80" align="end">
            <DescriptionMarkdownHelp />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
