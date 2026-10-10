import { db } from "@workspace/db";
import { blogPosts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SearchParamToast } from "@workspace/ui/components/search-param-toast";
import { requireManager } from "@/lib/auth";
import { Editor } from "@/components/editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManager();
  const { id } = await params;
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
      <Suspense fallback={null}>
        <SearchParamToast
          param="guardado"
          messages={{ "1": "Entrada guardada." }}
        />
      </Suspense>
      <Editor post={post} />
    </section>
  );
}
