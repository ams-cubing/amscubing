import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const match = /^[a-f0-9-]{36}\.(jpg|png|webp)$/.exec(name);
  if (!match) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(
      resolve(process.env.BLOG_MEDIA_DIR ?? "public/media/uploads", name),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": match[1] === "jpg" ? "image/jpeg" : `image/${match[1]}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public,max-age=31536000,immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
