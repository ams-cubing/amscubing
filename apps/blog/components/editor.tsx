"use client";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { BlogSection, BlogBlock, blogPosts } from "@workspace/db/schema";
import { brandColors, slugify } from "@/lib/content";
import { Sections } from "./sections";
import { RichText } from "./rich-text";
import { savePost } from "@/app/actions";
import { useUploadThing } from "@/lib/uploadthing-client";
const labels: Record<BlogBlock["type"], string> = {
  heading: "Título",
  text: "Texto",
  image: "Imagen",
  quote: "Cita",
  video: "Video",
  button: "Botón",
  divider: "Separador",
  html: "Contenido importado",
};
const colorLabels = {
  white: "Blanco",
  soft: "Gris claro",
  navy: "Azul AMS",
  red: "Rojo AMS",
  green: "Verde AMS",
  orange: "Naranja AMS",
};
function newBlock(type: BlogBlock["type"]): BlogBlock {
  return {
    id: crypto.randomUUID(),
    type,
    text: "",
    ...(type === "heading" ? { level: 2 as const } : {}),
  };
}
function newSection(): BlogSection {
  return {
    id: crypto.randomUUID(),
    background: "white",
    columns: 1,
    blocks: [newBlock("text")],
  };
}
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="button" disabled={pending}>
      {pending ? "Guardando…" : "Guardar entrada"}
    </button>
  );
}
export function Editor({ post }: { post?: typeof blogPosts.$inferSelect }) {
  const [sections, setSections] = useState<BlogSection[]>(post?.sections ?? []);
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { startUpload } = useUploadThing("blogImage");
  const dragging = useRef<{ section: string; block?: string } | null>(null);
  const updateSection = (id: string, patch: Partial<BlogSection>) =>
    setSections((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateBlock = (sid: string, id: string, patch: Partial<BlogBlock>) =>
    setSections((ss) =>
      ss.map((s) =>
        s.id === sid
          ? {
              ...s,
              blocks: s.blocks.map((b) =>
                b.id === id ? { ...b, ...patch } : b,
              ),
            }
          : s,
      ),
    );
  function moveSection(id: string, delta: number) {
    setSections((ss) => {
      const n = [...ss],
        i = n.findIndex((s) => s.id === id),
        j = i + delta;
      if (j < 0 || j >= n.length) return ss;
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
  }
  function moveBlock(sid: string, id: string, delta: number) {
    setSections((ss) =>
      ss.map((s) => {
        if (s.id !== sid) return s;
        const blocks = [...s.blocks],
          i = blocks.findIndex((b) => b.id === id),
          j = i + delta;
        if (j < 0 || j >= blocks.length) return s;
        [blocks[i], blocks[j]] = [blocks[j]!, blocks[i]!];
        return { ...s, blocks };
      }),
    );
  }
  function dropSection(target: string) {
    const source = dragging.current;
    if (!source || source.block) return;
    setSections((ss) => {
      const n = [...ss],
        from = n.findIndex((s) => s.id === source.section),
        to = n.findIndex((s) => s.id === target);
      const [section] = n.splice(from, 1);
      if (section) n.splice(to, 0, section);
      return n;
    });
    dragging.current = null;
  }
  function dropBlock(sid: string, bid?: string) {
    const source = dragging.current;
    if (!source?.block) return;
    setSections((ss) => {
      const block = ss
        .find((s) => s.id === source.section)
        ?.blocks.find((b) => b.id === source.block);
      if (!block) return ss;
      return ss.map((s) => {
        let blocks = s.blocks.filter((b) => b.id !== source.block);
        if (s.id === sid) {
          const at = bid
            ? blocks.findIndex((b) => b.id === bid)
            : blocks.length;
          blocks = [...blocks];
          blocks.splice(Math.max(0, at), 0, block);
        }
        return { ...s, blocks };
      });
    });
    dragging.current = null;
  }
  async function upload(file: File, sid?: string, bid?: string) {
    setBusy(true);
    setMessage("");
    try {
      const [uploaded] = (await startUpload([file])) ?? [];
      const url = uploaded?.serverData.url;
      if (!url) throw new Error("No se pudo cargar");
      if (sid && bid) updateBlock(sid, bid, { url });
      else {
        const input = document.querySelector<HTMLInputElement>(
          'input[name="coverUrl"]',
        );
        if (input) input.value = url;
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de carga");
    } finally {
      setBusy(false);
    }
  }
  function template(type: "guide" | "story") {
    const intro = newSection();
    intro.blocks = [
      {
        ...newBlock("heading"),
        text:
          type === "guide" ? "Antes de comenzar" : "Una historia de comunidad",
      },
      {
        ...newBlock("text"),
        text: "Escribe aquí la introducción de tu entrada.",
      },
    ];
    const middle = newSection();
    middle.background = "soft";
    middle.columns = 2;
    middle.blocks = [
      {
        ...newBlock("heading"),
        text: type === "guide" ? "Paso a paso" : "Lo que aprendimos",
      },
      { ...newBlock("text"), text: "Comparte las ideas principales." },
    ];
    setSections((ss) => [...ss, intro, middle]);
  }
  return (
    <form action={savePost}>
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="revision" value={post?.revision ?? 0} />
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 36, marginBottom: 8 }}>
            {post ? "Editar entrada" : "Nueva entrada"}
          </h1>
          <p className="meta">
            Arrastra las secciones y bloques, o usa las flechas para
            reordenarlos.
          </p>
        </div>
        <div className="tool-buttons">
          <button
            type="button"
            className="button secondary"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Volver al editor" : "Vista previa"}
          </button>
          <Submit />
        </div>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="editor-layout">
        <aside className="panel editor-sidebar">
          <label className="field">
            <span>Título</span>
            <input
              required
              name="title"
              maxLength={200}
              minLength={3}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
            />
          </label>
          <label className="field">
            <span>Enlace / slug</span>
            <input
              required
              name="slug"
              value={slug || slugify(title)}
              onChange={(e) => setSlug(e.target.value)}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
            <button
              type="button"
              className="button small secondary"
              onClick={() => setSlug(slugify(title))}
            >
              Usar título
            </button>
          </label>
          <label className="field">
            <span>Resumen</span>
            <textarea
              name="excerpt"
              defaultValue={post?.excerpt}
              maxLength={1000}
            />
          </label>
          <label className="field">
            <span>Portada (URL)</span>
            <input name="coverUrl" defaultValue={post?.coverUrl ?? ""} />
          </label>
          <label className="field">
            <span>Subir portada · JPG, PNG, WebP (10 MB)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </label>
          <label className="field">
            <span>Categorías · separadas por coma</span>
            <input
              name="categories"
              defaultValue={post?.categories.join(", ")}
            />
          </label>
          <label className="field">
            <span>Etiquetas · separadas por coma</span>
            <input name="tags" defaultValue={post?.tags.join(", ")} />
          </label>
          <label className="field">
            <span>Estado</span>
            <select name="status" defaultValue={post?.status ?? "draft"}>
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
              <option value="archived">Archivada</option>
            </select>
          </label>
          <label className="field">
            <input
              name="commentsEnabled"
              type="checkbox"
              defaultChecked={post?.commentsEnabled ?? true}
            />{" "}
            Permitir comentarios
          </label>
          <p className="meta">
            La tipografía y los colores son los oficiales de AMS. El editor
            controla el contenido y su distribución.
          </p>
        </aside>
        <div className="editor-canvas">
          {preview ? (
            <>
              <p className="preview-label">VISTA PREVIA DEL CONTENIDO</p>
              <Sections sections={sections} />
            </>
          ) : (
            <>
              {sections.map((s, si) => (
                <div
                  className="editor-section"
                  key={s.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropSection(s.id);
                  }}
                >
                  <div className="section-tools">
                    <span
                      draggable
                      onDragStart={(e) => {
                        dragging.current = { section: s.id };
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", s.id);
                      }}
                      tabIndex={0}
                      aria-label={`Arrastrar sección ${si + 1}`}
                    >
                      ⠿ Sección {si + 1}
                    </span>
                    <div className="palette">
                      {Object.entries(brandColors).map(([key, color]) => (
                        <button
                          key={key}
                          type="button"
                          title={colorLabels[key as keyof typeof colorLabels]}
                          aria-label={`Fondo ${colorLabels[key as keyof typeof colorLabels]}`}
                          aria-pressed={s.background === key}
                          style={{ background: color }}
                          onClick={() =>
                            updateSection(s.id, {
                              background: key as BlogSection["background"],
                            })
                          }
                        />
                      ))}
                    </div>
                    <select
                      aria-label={`Columnas sección ${si + 1}`}
                      value={s.columns}
                      onChange={(e) =>
                        updateSection(s.id, {
                          columns: Number(e.target.value) as 1 | 2 | 3,
                        })
                      }
                    >
                      <option value={1}>Una columna</option>
                      <option value={2}>Dos columnas</option>
                      <option value={3}>Tres columnas</option>
                    </select>
                    <div className="tool-buttons">
                      <button
                        type="button"
                        aria-label="Subir sección"
                        onClick={() => moveSection(s.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Bajar sección"
                        onClick={() => moveSection(s.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSections((ss) => ss.filter((x) => x.id !== s.id))
                        }
                      >
                        Quitar sección
                      </button>
                    </div>
                  </div>
                  <div
                    className={`article-section tone-${s.background}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      if (dragging.current?.block) {
                        e.preventDefault();
                        e.stopPropagation();
                        dropBlock(s.id);
                      }
                    }}
                  >
                    <div className={`section-grid columns-${s.columns}`}>
                      {s.blocks.map((b) => (
                        <div
                          className="editor-block"
                          key={b.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dropBlock(s.id, b.id);
                          }}
                        >
                          <div className="block-tools">
                            <span
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                dragging.current = {
                                  section: s.id,
                                  block: b.id,
                                };
                                e.dataTransfer.setData("text/plain", b.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                            >
                              ⠿ {labels[b.type]}
                            </span>
                            <div className="tool-buttons">
                              <button
                                type="button"
                                aria-label="Subir bloque"
                                onClick={() => moveBlock(s.id, b.id, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                aria-label="Bajar bloque"
                                onClick={() => moveBlock(s.id, b.id, 1)}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSection(s.id, {
                                    blocks: s.blocks.filter(
                                      (x) => x.id !== b.id,
                                    ),
                                  })
                                }
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                          {b.type !== "divider" && (
                            <label className="field">
                              <span>
                                {b.type === "image"
                                  ? "Texto alternativo"
                                  : b.type === "html"
                                    ? "Contenido"
                                    : b.type === "video"
                                      ? "Título del video"
                                      : "Contenido"}
                              </span>
                              {b.type === "html" ? (
                                <RichText
                                  value={b.text}
                                  onChange={(text) =>
                                    updateBlock(s.id, b.id, { text })
                                  }
                                />
                              ) : (
                                <textarea
                                  value={b.text}
                                  onChange={(e) =>
                                    updateBlock(s.id, b.id, {
                                      text: e.target.value,
                                    })
                                  }
                                />
                              )}
                            </label>
                          )}
                          {b.type === "heading" && (
                            <select
                              aria-label="Nivel de título"
                              value={b.level ?? 2}
                              onChange={(e) =>
                                updateBlock(s.id, b.id, {
                                  level: Number(e.target.value) as 2 | 3,
                                })
                              }
                            >
                              <option value={2}>Título de sección</option>
                              <option value={3}>Subtítulo</option>
                            </select>
                          )}
                          {["image", "video", "button"].includes(b.type) && (
                            <label className="field">
                              <span>
                                {b.type === "video"
                                  ? "URL de YouTube o Vimeo"
                                  : "URL"}
                              </span>
                              <input
                                value={b.url ?? ""}
                                onChange={(e) =>
                                  updateBlock(s.id, b.id, {
                                    url: e.target.value,
                                  })
                                }
                              />
                            </label>
                          )}
                          {b.type === "image" && (
                            <label className="field">
                              <span>Subir imagen</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                disabled={busy}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void upload(f, s.id, b.id);
                                }}
                              />
                              {b.url && <img src={b.url} alt={b.text} />}
                            </label>
                          )}
                          {["image", "quote"].includes(b.type) && (
                            <label className="field">
                              <span>
                                {b.type === "quote"
                                  ? "Autoría"
                                  : "Pie de imagen"}
                              </span>
                              <input
                                value={b.caption ?? ""}
                                onChange={(e) =>
                                  updateBlock(s.id, b.id, {
                                    caption: e.target.value,
                                  })
                                }
                              />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="block-adder">
                      {(Object.keys(labels) as BlogBlock["type"][])
                        .filter((t) => t !== "html")
                        .map((type) => (
                          <button
                            type="button"
                            key={type}
                            onClick={() =>
                              updateSection(s.id, {
                                blocks: [...s.blocks, newBlock(type)],
                              })
                            }
                          >
                            + {labels[type]}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="panel block-adder">
                <button
                  type="button"
                  onClick={() => setSections((ss) => [...ss, newSection()])}
                >
                  + Sección
                </button>
                <button type="button" onClick={() => template("guide")}>
                  + Plantilla de guía
                </button>
                <button type="button" onClick={() => template("story")}>
                  + Plantilla de historia
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
