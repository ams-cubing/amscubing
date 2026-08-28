"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as React from "react";

import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { descriptionProseClassName } from "./markdown-content";
import { DescriptionToolbar } from "./description-toolbar";

export type DescriptionEditorHandle = {
  focus: () => void;
  getMarkdown: () => string;
};

export const DescriptionEditorField = React.forwardRef<
  DescriptionEditorHandle,
  {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    markdownMode: boolean;
    onMarkdownModeChange: (value: boolean) => void;
    onOpenAttachments?: () => void;
  }
>(function DescriptionEditorField(
  {
    value,
    onChange,
    disabled = false,
    placeholder,
    markdownMode,
    onMarkdownModeChange,
    onOpenAttachments,
  },
  ref,
) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedRef = React.useRef(value);
  const markdownTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled && !markdownMode,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full rounded-md",
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder ?? "Añade una descripción más detallada…",
      }),
      Markdown.configure({
        markedOptions: { gfm: true },
      }),
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: cn(
          descriptionProseClassName,
          "min-h-40 px-3 py-2 outline-none focus:outline-none",
        ),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (markdownMode) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const markdown = currentEditor.getMarkdown();
        lastEmittedRef.current = markdown;
        onChangeRef.current(markdown);
      }, 300);
    },
  });

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      if (markdownMode) {
        markdownTextareaRef.current?.focus();
        return;
      }
      editor?.commands.focus("end");
    },
    getMarkdown: () => {
      if (markdownMode) return value;
      return editor?.getMarkdown() ?? value;
    },
  }));

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled && !markdownMode);
  }, [editor, disabled, markdownMode]);

  React.useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    editor.commands.setContent(value, { contentType: "markdown" });
  }, [editor, value]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleMarkdownModeChange(next: boolean) {
    if (next && editor) {
      const markdown = editor.getMarkdown();
      lastEmittedRef.current = markdown;
      onChange(markdown);
    } else if (!next && editor) {
      lastEmittedRef.current = value;
      editor.commands.setContent(value, { contentType: "markdown" });
      requestAnimationFrame(() => editor.commands.focus("end"));
    }
    onMarkdownModeChange(next);
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <DescriptionToolbar
        editor={editor}
        disabled={disabled}
        markdownMode={markdownMode}
        onMarkdownModeChange={handleMarkdownModeChange}
        onOpenAttachments={onOpenAttachments}
      />
      {markdownMode ? (
        <Textarea
          ref={markdownTextareaRef}
          value={value}
          rows={8}
          placeholder="Escribe en Markdown: **negrita**, *cursiva*, [enlace](url), listas, etc."
          className="min-h-40 resize-y rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
          onChange={(e) => {
            lastEmittedRef.current = e.target.value;
            onChange(e.target.value);
          }}
          disabled={disabled}
        />
      ) : !editor ? (
        <div className="min-h-40 px-3 py-2 text-sm text-muted-foreground">
          Cargando editor…
        </div>
      ) : (
        <div className="bg-background">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
});
