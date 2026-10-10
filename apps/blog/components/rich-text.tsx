"use client";
import { useRef, useState } from "react";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { cleanHtml } from "@/lib/content";
import { richContentClass } from "./sections";

export const toolButtonClass =
  "rounded-md border border-ams-navy/15 bg-white px-2 py-1 text-xs text-ams-navy hover:bg-ams-soft";

export function RichText({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  function format(command: string, arg?: string) {
    editor.current?.focus();
    document.execCommand(command, false, arg);
    if (editor.current) onChange(cleanHtml(editor.current.innerHTML));
  }
  return (
    <div>
      <div
        className="flex flex-wrap gap-1.5"
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          type="button"
          aria-label="Negrita"
          className={toolButtonClass}
          onClick={() => format("bold")}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          aria-label="Cursiva"
          className={toolButtonClass}
          onClick={() => format("italic")}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={toolButtonClass}
          onClick={() => format("insertUnorderedList")}
        >
          Lista
        </button>
        <button
          type="button"
          className={toolButtonClass}
          onClick={() => format("removeFormat")}
        >
          Limpiar formato
        </button>
      </div>
      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Contenido de la entrada"
        aria-multiline="true"
        className={cn(
          richContentClass,
          "my-3 min-h-35 rounded-md border border-ams-navy/20 bg-white p-4 font-normal outline-offset-2",
        )}
        dangerouslySetInnerHTML={{ __html: cleanHtml(value) }}
        onBlur={(e) => onChange(cleanHtml(e.currentTarget.innerHTML))}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand(
            "insertText",
            false,
            e.clipboardData.getData("text/plain"),
          );
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        <Input
          aria-label="Enlace del texto seleccionado"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-8 w-auto flex-1 bg-white"
        />
        <button
          type="button"
          className={toolButtonClass}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (/^https?:\/\//.test(url)) format("createLink", url);
          }}
        >
          Añadir enlace
        </button>
      </div>
    </div>
  );
}
