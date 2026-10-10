import { db } from "@workspace/db";
import { blogPosts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AmsNotice } from "@workspace/ui/components/ams-field";
import { requireManager } from "@/lib/auth";
import { Editor } from "@/components/editor";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; guardado?: string }>;
}) {
  await requireManager();
  const { id } = await params;
  const p = await searchParams;
  const [post] =
    id === "nueva"
      ? []
      : await db
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.id, Number(id)));
  if (id !== "nueva" && !post) notFound();
  return (
    <section className="ams-container max-w-295 py-14">
      {p.guardado && <AmsNotice role="status">Entrada guardada.</AmsNotice>}
      {p.error && (
        <AmsNotice tone="error" role="alert">
          {{
            datos: "Revisa el título, enlace y portada.",
            bloques:
              "Revisa los bloques y sus URLs. Solo se permiten opciones de marca AMS.",
            slug: "Ese enlace ya existe o no se pudo guardar.",
            conflicto:
              "Otra persona modificó la entrada. Recarga para obtener la versión actual antes de guardar.",
          }[p.error] ?? "No se pudo guardar."}
        </AmsNotice>
      )}
      <Editor post={post} />
    </section>
  );
}
