"use client";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { BlogSection, BlogBlock, blogPosts } from "@workspace/db/schema";
import { AmsField, AmsNotice } from "@workspace/ui/components/ams-field";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { brandColors, slugify } from "@/lib/content";
import {
  Sections,
  sectionClass,
  sectionColumnsClass,
  sectionToneClass,
} from "./sections";
import { RichText, toolButtonClass } from "./rich-text";
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
const blockAdderClass =
  "rounded-full border border-ams-navy/20 bg-white px-3 py-1.5 text-xs text-ams-navy hover:bg-ams-soft";
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
    <Button variant="destructive" disabled={pending}>
      {pending ? "Guardando…" : "Guardar entrada"}
    </Button>
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ams-display mb-2 text-4xl leading-[1.08]">
            {post ? "Editar entrada" : "Nueva entrada"}
          </h1>
          <p className="text-[13px] text-ams-navy/60">
            Arrastra las secciones y bloques, o usa las flechas para
            reordenarlos.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="brand"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Volver al editor" : "Vista previa"}
          </Button>
          <Submit />
        </div>
      </div>
      {message && <AmsNotice role="status">{message}</AmsNotice>}
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl bg-white p-5 sm:p-8 lg:sticky lg:top-4">
          <AmsField label="Título">
            <Input
              required
              name="title"
              maxLength={200}
              minLength={3}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
            />
          </AmsField>
          <AmsField label="Enlace / slug">
            <Input
              required
              name="slug"
              value={slug || slugify(title)}
              onChange={(e) => setSlug(e.target.value)}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
            <Button
              type="button"
              size="sm"
              variant="brand"
              className="mt-2"
              onClick={() => setSlug(slugify(title))}
            >
              Usar título
            </Button>
          </AmsField>
          <AmsField label="Resumen">
            <Textarea
              name="excerpt"
              defaultValue={post?.excerpt}
              maxLength={1000}
              className="min-h-28"
            />
          </AmsField>
          <AmsField label="Portada (URL)">
            <Input name="coverUrl" defaultValue={post?.coverUrl ?? ""} />
          </AmsField>
          <AmsField label="Subir portada · JPG, PNG, WebP (10 MB)">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </AmsField>
          <AmsField label="Categorías · separadas por coma">
            <Input
              name="categories"
              defaultValue={post?.categories.join(", ")}
            />
          </AmsField>
          <AmsField label="Etiquetas · separadas por coma">
            <Input name="tags" defaultValue={post?.tags.join(", ")} />
          </AmsField>
          <AmsField label="Estado">
            <NativeSelect name="status" defaultValue={post?.status ?? "draft"}>
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
              <option value="archived">Archivada</option>
            </NativeSelect>
          </AmsField>
          <label className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <input
              name="commentsEnabled"
              type="checkbox"
              defaultChecked={post?.commentsEnabled ?? true}
            />
            Permitir comentarios
          </label>
          <p className="text-[13px] text-ams-navy/60">
            La tipografía y los colores son los oficiales de AMS. El editor
            controla el contenido y su distribución.
          </p>
        </aside>
        <div className="min-w-0">
          {preview ? (
            <>
              <p className="ams-heading mb-6 text-xs font-bold">
                VISTA PREVIA DEL CONTENIDO
              </p>
              <Sections sections={sections} />
            </>
          ) : (
            <>
              {sections.map((s, si) => (
                <div
                  className="mb-6 border border-ams-navy/20"
                  key={s.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropSection(s.id);
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 bg-ams-soft p-3.5 text-xs text-ams-navy sm:gap-2.5">
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
                    <div className="flex gap-1.5">
                      {Object.entries(brandColors).map(([key, color]) => (
                        <button
                          key={key}
                          type="button"
                          className="size-6 rounded-full border border-ams-navy/40 p-0 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-ams-red"
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
                    <NativeSelect
                      aria-label={`Columnas sección ${si + 1}`}
                      value={s.columns}
                      className="h-8 w-auto max-w-45 text-xs md:text-xs"
                      onChange={(e) =>
                        updateSection(s.id, {
                          columns: Number(e.target.value) as 1 | 2 | 3,
                        })
                      }
                    >
                      <option value={1}>Una columna</option>
                      <option value={2}>Dos columnas</option>
                      <option value={3}>Tres columnas</option>
                    </NativeSelect>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className={toolButtonClass}
                        aria-label="Subir sección"
                        onClick={() => moveSection(s.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={toolButtonClass}
                        aria-label="Bajar sección"
                        onClick={() => moveSection(s.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={toolButtonClass}
                        onClick={() =>
                          setSections((ss) => ss.filter((x) => x.id !== s.id))
                        }
                      >
                        Quitar sección
                      </button>
                    </div>
                  </div>
                  <div
                    className={cn(sectionClass, sectionToneClass[s.background])}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      if (dragging.current?.block) {
                        e.preventDefault();
                        e.stopPropagation();
                        dropBlock(s.id);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "grid gap-6",
                        sectionColumnsClass[s.columns],
                      )}
                    >
                      {s.blocks.map((b) => (
                        <div
                          className="mb-4 min-w-0 border border-dashed border-ams-navy/20 bg-white p-4 text-ams-navy focus-within:outline-2 focus-within:outline-ams-red"
                          key={b.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dropBlock(s.id, b.id);
                          }}
                        >
                          <div className="mb-3 flex flex-wrap justify-between gap-2.5 text-xs">
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
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                className={toolButtonClass}
                                aria-label="Subir bloque"
                                onClick={() => moveBlock(s.id, b.id, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className={toolButtonClass}
                                aria-label="Bajar bloque"
                                onClick={() => moveBlock(s.id, b.id, 1)}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className={toolButtonClass}
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
                            <AmsField
                              label={
                                b.type === "image"
                                  ? "Texto alternativo"
                                  : b.type === "video"
                                    ? "Título del video"
                                    : "Contenido"
                              }
                            >
                              {b.type === "html" ? (
                                <RichText
                                  value={b.text}
                                  onChange={(text) =>
                                    updateBlock(s.id, b.id, { text })
                                  }
                                />
                              ) : (
                                <Textarea
                                  value={b.text}
                                  className="min-h-28 bg-white font-normal"
                                  onChange={(e) =>
                                    updateBlock(s.id, b.id, {
                                      text: e.target.value,
                                    })
                                  }
                                />
                              )}
                            </AmsField>
                          )}
                          {b.type === "heading" && (
                            <NativeSelect
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
                            </NativeSelect>
                          )}
                          {["image", "video", "button"].includes(b.type) && (
                            <AmsField
                              label={
                                b.type === "video"
                                  ? "URL de YouTube o Vimeo"
                                  : "URL"
                              }
                            >
                              <Input
                                value={b.url ?? ""}
                                className="bg-white"
                                onChange={(e) =>
                                  updateBlock(s.id, b.id, {
                                    url: e.target.value,
                                  })
                                }
                              />
                            </AmsField>
                          )}
                          {b.type === "image" && (
                            <AmsField label="Subir imagen">
                              <Input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                disabled={busy}
                                className="bg-white"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void upload(f, s.id, b.id);
                                }}
                              />
                              {b.url && (
                                <img
                                  src={b.url}
                                  alt={b.text}
                                  className="mt-3 h-auto max-w-full rounded-sm"
                                />
                              )}
                            </AmsField>
                          )}
                          {["image", "quote"].includes(b.type) && (
                            <AmsField
                              label={
                                b.type === "quote" ? "Autoría" : "Pie de imagen"
                              }
                            >
                              <Input
                                value={b.caption ?? ""}
                                className="bg-white"
                                onChange={(e) =>
                                  updateBlock(s.id, b.id, {
                                    caption: e.target.value,
                                  })
                                }
                              />
                            </AmsField>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(labels) as BlogBlock["type"][])
                        .filter((t) => t !== "html")
                        .map((type) => (
                          <button
                            type="button"
                            key={type}
                            className={blockAdderClass}
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
              <div className="flex flex-wrap gap-2 rounded-3xl bg-white p-5 sm:p-8">
                <button
                  type="button"
                  className={blockAdderClass}
                  onClick={() => setSections((ss) => [...ss, newSection()])}
                >
                  + Sección
                </button>
                <button
                  type="button"
                  className={blockAdderClass}
                  onClick={() => template("guide")}
                >
                  + Plantilla de guía
                </button>
                <button
                  type="button"
                  className={blockAdderClass}
                  onClick={() => template("story")}
                >
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
