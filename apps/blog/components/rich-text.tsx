"use client";
import { useRef, useState } from "react";
import { cleanHtml } from "@/lib/content";
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
      <div className="tool-buttons" onMouseDown={(e) => e.preventDefault()}>
        <button
          type="button"
          aria-label="Negrita"
          onClick={() => format("bold")}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          aria-label="Cursiva"
          onClick={() => format("italic")}
        >
          <em>I</em>
        </button>
        <button type="button" onClick={() => format("insertUnorderedList")}>
          Lista
        </button>
        <button type="button" onClick={() => format("removeFormat")}>
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
        className="rich-content rich-editor"
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
      <div className="tool-buttons">
        <input
          aria-label="Enlace del texto seleccionado"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
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
