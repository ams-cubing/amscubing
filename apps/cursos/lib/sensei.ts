import { parse } from "csv-parse/sync";
import type { CourseQuestion } from "@workspace/db/schema";
import { cleanHtml } from "./content";

export type SenseiRow = Record<string, string>;
export function readCsv(contents: string): SenseiRow[] {
  const records = parse(contents, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];
  const header = records.shift();
  if (!header) throw new Error("CSV vacío");
  return records.map((row) => {
    // Sensei Certificates adds an unlabeled eighth column to course reports.
    const certificate =
      header[header.length - 1] === "Certificate" &&
      row.length === header.length + 1;
    if (
      row.length < header.length ||
      (!certificate && row.slice(header.length).some((value) => value.trim()))
    )
      throw new Error("CSV con columnas inconsistentes");
    const result = Object.fromEntries(header.map((key, i) => [key, row[i]!]));
    if (certificate)
      result.Certificate = row[header.length]! || result.Certificate!;
    return result;
  });
}
export function uniqueRows(rows: SenseiRow[]) {
  const unique = new Map<string, SenseiRow>();
  for (const row of rows) {
    const prior = unique.get(row.Id!);
    if (prior && JSON.stringify(prior) !== JSON.stringify(row))
      throw new Error(`Exportación inconsistente para id ${row.Id}`);
    unique.set(row.Id!, row);
  }
  return unique;
}
export function references(value: string) {
  return [...value.matchAll(/(?:^|,)id:(\d+)/g)].map((m) => Number(m[1]));
}
export function convertQuestion(row: SenseiRow): CourseQuestion {
  const prompt = cleanHtml(row.Question!)
    .replace(/<[^>]*>/g, "")
    .trim();
  const points = Number(row.Grade) || 1;
  if (row.Type === "boolean")
    return {
      id: row.Id!,
      prompt,
      type: "boolean",
      options: ["Verdadero", "Falso"],
      answers: [row.Answer === "true" ? "Verdadero" : "Falso"],
      points,
    };
  if (row.Type !== "multiple-choice")
    throw new Error(`Tipo de pregunta no soportado: ${row.Type}`);
  const entries = [
    ...row.Answer!.matchAll(
      /(?:^|,)(Right|Wrong):([\s\S]*?)(?=,(?:Right|Wrong):|$)/g,
    ),
  ].map((m) => ({
    correct: m[1] === "Right",
    text: cleanHtml(m[2]!.replace(/^"([\s\S]*)"$/, "$1").replace(/""/g, '"'))
      .replace(/<[^>]*>/g, "")
      .trim(),
  }));
  if (
    !entries.length ||
    entries.some((e) => !e.text) ||
    !entries.some((e) => e.correct)
  )
    throw new Error(`Opciones inválidas en pregunta ${row.Id}`);
  return {
    id: row.Id!,
    prompt,
    type: "choice",
    options: entries.map((e) => e.text),
    answers: entries.filter((e) => e.correct).map((e) => e.text),
    points,
  };
}
export function convertContent(html: string) {
  // Sensei serializes quiz answers and obsolete lesson action buttons inside
  // Gutenberg blocks. They must never be rendered to the learner.
  html = html
    .replace(
      /<!-- wp:sensei-lms\/button-take-course\b[\s\S]*?<!-- \/wp:sensei-lms\/button-take-course -->/g,
      "",
    )
    .replace(
      /<!-- wp:sensei-lms\/quiz\b[\s\S]*?<!-- \/wp:sensei-lms\/quiz -->/g,
      "",
    )
    .replace(
      /<!-- wp:sensei-lms\/lesson-actions\b[\s\S]*?<!-- \/wp:sensei-lms\/lesson-actions -->/g,
      "",
    )
    .replace(
      /<!-- wp:sensei-lms\/course-outline\b[\s\S]*?<!-- \/wp:sensei-lms\/course-outline -->/g,
      "",
    );
  html = html.replace(
    /<!-- wp:embed (\{[^\n]*\}) -->[\s\S]*?<!-- \/wp:embed -->/g,
    (block, json) => {
      try {
        const data = JSON.parse(json);
        const url = new URL(data.url);
        let videoId: string | null = null;
        if (url.hostname === "youtu.be") videoId = url.pathname.slice(1);
        if (["youtube.com", "www.youtube.com"].includes(url.hostname))
          videoId = url.searchParams.get("v");
        if (videoId && /^[\w-]+$/.test(videoId))
          return `<iframe title="Video de la lección" src="https://www.youtube-nocookie.com/embed/${videoId}" allowfullscreen></iframe>`;
      } catch {
        /* retain sanitized original */
      }
      return block;
    },
  );
  return cleanHtml(html);
}
export function parseDate(value: string) {
  if (!value || value === "-" || value.startsWith("0000")) return null;
  const date = new Date(value.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? null : date;
}
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
export function isCompleted(status: string) {
  return ["completado", "aprobado", "completed", "passed"].includes(
    status.trim().toLowerCase(),
  );
}
