"use client";

export function DescriptionMarkdownHelp() {
  const shortcuts = [
    { syntax: "**texto**", label: "Negrita" },
    { syntax: "*texto*", label: "Cursiva" },
    { syntax: "~~texto~~", label: "Tachado" },
    { syntax: "[texto](url)", label: "Enlace" },
    { syntax: "![alt](url)", label: "Imagen" },
    { syntax: "# Título", label: "Encabezado 1" },
    { syntax: "## Título", label: "Encabezado 2" },
    { syntax: "- ítem", label: "Lista con viñetas" },
    { syntax: "1. ítem", label: "Lista numerada" },
    { syntax: "> cita", label: "Cita" },
    { syntax: "`código`", label: "Código en línea" },
  ];

  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">Atajos de Markdown</p>
      <ul className="space-y-1.5">
        {shortcuts.map((item) => (
          <li key={item.syntax} className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">{item.label}</span>
            <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {item.syntax}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}
