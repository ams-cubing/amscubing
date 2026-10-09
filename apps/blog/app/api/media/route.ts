import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getViewer } from "@/lib/auth";
import { consumeLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.canManage)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  if (new URL(request.url).origin !== request.headers.get("origin"))
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024)
    return NextResponse.json({ error: "Máximo 10 MB" }, { status: 413 });
  if (!(await consumeLimit(`upload:${viewer.id}`, 30, 600)))
    return NextResponse.json(
      { error: "Demasiadas cargas. Espera unos minutos." },
      { status: 429 },
    );
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || file.size > 10 * 1024 * 1024 || file.size < 12)
    return NextResponse.json(
      { error: "Usa una imagen de hasta 10 MB" },
      { status: 400 },
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  let ext: string | undefined;
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ext = "jpg";
  else if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    ext = "png";
  else if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    ext = "webp";
  if (!ext)
    return NextResponse.json(
      { error: "Solo JPG, PNG y WebP" },
      { status: 400 },
    );
  const directory = resolve(
    process.env.BLOG_MEDIA_DIR ?? "public/media/uploads",
  );
  await mkdir(directory, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(resolve(directory, name), bytes, { flag: "wx" });
  return NextResponse.json({ url: `/media/uploads/${name}` });
}
