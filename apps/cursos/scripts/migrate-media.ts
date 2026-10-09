import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  createWriteStream,
} from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { readCsv, references } from "../lib/sensei";

const directory = resolve(process.argv[2] ?? "../../.codex/migration/sensei");
const files = readdirSync(directory);
const read = (type: string) =>
  readCsv(
    readFileSync(
      resolve(directory, files.find((f) => f.includes(`-${type}-`))!),
      "utf8",
    ),
  );
const course = read("Courses").find((r) => r.Id === "206");
if (!course) throw new Error("Falta el curso AMS");
const ids = references(course.Lessons!);
const rows = [
  course,
  ...read("Lessons").filter((r) => ids.includes(Number(r.Id))),
];
const candidates = rows
  .flatMap((r) => [
    r.Image,
    r.Video,
    ...[...(r.Description ?? "").matchAll(/(?:src|href)="([^"]+)"/g)].map(
      (m) => m[1],
    ),
  ])
  .filter((v): v is string => !!v);
const urls = [...new Set(candidates)].filter((value) => {
  try {
    const u = new URL(value);
    return (
      ["amscubing.org", "old.amscubing.org", "www.amscubing.org"].includes(
        u.hostname,
      ) &&
      u.pathname.startsWith("/wp-content/uploads/") &&
      /\.(png|jpe?g|gif|webp|mp4|pdf)$/i.test(u.pathname)
    );
  } catch {
    return false;
  }
});
const mediaDir = resolve("public/media/wordpress");
mkdirSync(mediaDir, { recursive: true });
const mapping: Record<string, string> = {};
for (const source of urls) {
  const original = new URL(source);
  const remote = new URL(original.pathname, "https://old.amscubing.org");
  const filename =
    createHash("sha256").update(remote.toString()).digest("hex").slice(0, 20) +
    extname(original.pathname).toLowerCase();
  const target = resolve(mediaDir, filename);
  if (!existsSync(target)) {
    const response = await fetch(remote, {
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok || !response.body)
      throw new Error(`No se pudo descargar archivo: HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > 512 * 1024 * 1024)
      throw new Error("Archivo demasiado grande");
    await pipeline(
      Readable.fromWeb(
        response.body as import("node:stream/web").ReadableStream,
      ),
      createWriteStream(target, { flags: "wx" }),
    );
  }
  mapping[source] = `/media/wordpress/${filename}`;
}
writeFileSync(
  resolve(directory, "media-map.json"),
  JSON.stringify(mapping, null, 2),
);
console.log(`Medios copiados: ${urls.length}`);
