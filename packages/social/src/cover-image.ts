import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  formatCoverDateRange,
  formatCoverRegistrationRange,
  formatPlaceLine,
} from "./format";

export const COVER_WIDTH = 1640;
export const COVER_HEIGHT = 924;
export const COVER_MAX_SLOTS = 9;
export const COVER_COLS = 3;
export const COVER_ROWS = 3;

const LOGO_FETCH_TIMEOUT_MS = 8_000;
const LOGO_MAX_BYTES = 8 * 1024 * 1024;

const TITLE_YELLOW = "#FFE600";
const DATE_MAGENTA = "#FF2D9B";
const LABEL_WHITE = "#FFFFFF";

const ASSETS_DIR_CANDIDATES = [
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets"),
  path.resolve(process.cwd(), "packages/social/assets"),
  path.resolve(process.cwd(), "../packages/social/assets"),
  path.resolve(process.cwd(), "../../packages/social/assets"),
];

function resolveAssetsDir(): string {
  for (const dir of ASSETS_DIR_CANDIDATES) {
    if (existsSync(path.join(dir, "cover-background.png"))) {
      return dir;
    }
  }
  throw new Error(
    "Falta packages/social/assets/cover-background.png (fondo de portada).",
  );
}

export function resolveCoverAssetsDir(): string {
  return resolveAssetsDir();
}

function findFontFile(candidates: string[]): string | null {
  const fontsDir = path.join(resolveAssetsDir(), "fonts");
  for (const name of candidates) {
    const full = path.join(fontsDir, name);
    if (existsSync(full)) return full;
  }
  const fallback = path.join(fontsDir, "GamingSporty.ttf");
  return existsSync(fallback) ? fallback : null;
}

export type CoverSlotInput = {
  city: string;
  stateName?: string | null;
  startDate: string;
  endDate: string;
  logoUrl?: string | null;
  registrationOpen?: string | null;
  registrationClose?: string | null;
};

export type CoverSlot = {
  placeLine: string;
  eventDates: string;
  registrationDates: string | null;
  logoBuffer: Buffer | null;
};

/** Select up to 9 competitions for the cover (already sorted by startDate asc). */
export function selectCoverCompetitions<T>(competitions: T[]): T[] {
  return competitions.slice(0, COVER_MAX_SLOTS);
}

function fontFileToCssUrl(fontPath: string): string {
  const data = readFileSync(fontPath);
  const ext = path.extname(fontPath).toLowerCase();
  const mime =
    ext === ".otf"
      ? "font/otf"
      : ext === ".woff2"
        ? "font/woff2"
        : ext === ".woff"
          ? "font/woff"
          : "font/ttf";
  return `url('data:${mime};base64,${data.toString("base64")}')`;
}

async function fetchLogoBuffer(
  logoUrl: string | null | undefined,
): Promise<Buffer | null> {
  const url = logoUrl?.trim();
  if (!url) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > LOGO_MAX_BYTES) {
      return null;
    }
    return await sharp(buffer)
      .resize(220, 220, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export async function prepareCoverSlots(
  inputs: CoverSlotInput[],
): Promise<CoverSlot[]> {
  const selected = selectCoverCompetitions(inputs);
  return Promise.all(
    selected.map(async (input) => {
      const placeLine = formatPlaceLine(input.city, input.stateName, {
        separator: ". ",
      });
      const eventDates = formatCoverDateRange(input.startDate, input.endDate);
      const registrationDates = formatCoverRegistrationRange(
        input.registrationOpen,
        input.registrationClose,
      );
      const logoBuffer = await fetchLogoBuffer(input.logoUrl);
      return { placeLine, eventDates, registrationDates, logoBuffer };
    }),
  );
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildCellSvg(
  slot: CoverSlot,
  cellWidth: number,
  cellHeight: number,
): Buffer {
  const scriptFont = findFontFile([
    "SmoothFantasy.ttf",
    "SmoothFantasy.otf",
    "Smooth Fantasy.ttf",
    "Smooth Fantasy.otf",
  ]);
  const boldFont = findFontFile([
    "CodecPro-ExtraBold.ttf",
    "CodecProExtraBold.ttf",
    "Codec Pro ExtraBold.ttf",
    "CodecPro-Bold.ttf",
  ]);
  const regularFont = findFontFile([
    "CodecPro.ttf",
    "CodecPro-Regular.ttf",
    "Codec Pro.ttf",
    "CodecProRegular.ttf",
  ]);

  const faces: string[] = [];
  if (scriptFont) {
    faces.push(
      `@font-face{font-family:'CoverScript';src:${fontFileToCssUrl(scriptFont)};}`,
    );
  }
  if (boldFont) {
    faces.push(
      `@font-face{font-family:'CoverBold';src:${fontFileToCssUrl(boldFont)};}`,
    );
  }
  if (regularFont) {
    faces.push(
      `@font-face{font-family:'CoverRegular';src:${fontFileToCssUrl(regularFont)};}`,
    );
  }

  const scriptFamily = scriptFont ? "CoverScript" : "cursive";
  const boldFamily = boldFont ? "CoverBold" : "sans-serif";
  const regularFamily = regularFont ? "CoverRegular" : "sans-serif";

  const cx = cellWidth / 2;
  // Leave room for the logo composite above the text block.
  const textTop = slot.logoBuffer ? 250 : 120;
  const place = escapeXml(slot.placeLine);
  const dates = escapeXml(slot.eventDates);
  const regLabel = slot.registrationDates ? "REGISTRO" : "";
  const regDates = slot.registrationDates
    ? escapeXml(slot.registrationDates)
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${cellWidth}" height="${cellHeight}" viewBox="0 0 ${cellWidth} ${cellHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style><![CDATA[
      ${faces.join("")}
      .place { font-family: '${scriptFamily}', cursive; font-size: 42px; fill: ${TITLE_YELLOW}; filter: url(#glow); }
      .dates { font-family: '${boldFamily}', sans-serif; font-size: 26px; fill: ${DATE_MAGENTA}; font-weight: 800; }
      .reg-label { font-family: '${regularFamily}', sans-serif; font-size: 16px; fill: ${LABEL_WHITE}; letter-spacing: 0.12em; }
      .reg-dates { font-family: '${regularFamily}', sans-serif; font-size: 18px; fill: ${LABEL_WHITE}; }
    ]]></style>
  </defs>
  <text class="place" x="${cx}" y="${textTop}" text-anchor="middle">${place}</text>
  <text class="dates" x="${cx}" y="${textTop + 48}" text-anchor="middle">${dates}</text>
  ${
    regLabel
      ? `<text class="reg-label" x="${cx}" y="${textTop + 84}" text-anchor="middle">${regLabel}</text>
  <text class="reg-dates" x="${cx}" y="${textTop + 112}" text-anchor="middle">${regDates}</text>`
      : ""
  }
</svg>`;

  return Buffer.from(svg);
}

/**
 * Composite the Torneo de Rubik Facebook cover (1640×924, up to 9 slots).
 * No status badges or capacity fractions.
 */
export async function generateCoverPng(slots: CoverSlot[]): Promise<Buffer> {
  const assetsDir = resolveAssetsDir();
  const backgroundPath = path.join(assetsDir, "cover-background.png");
  if (!existsSync(backgroundPath)) {
    throw new Error(
      `Falta el fondo de portada en ${backgroundPath}. Copia cover-background.png a packages/social/assets/.`,
    );
  }

  const cellWidth = Math.floor(COVER_WIDTH / COVER_COLS);
  const cellHeight = Math.floor(COVER_HEIGHT / COVER_ROWS);
  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < slots.length && i < COVER_MAX_SLOTS; i++) {
    const slot = slots[i]!;
    const col = i % COVER_COLS;
    const row = Math.floor(i / COVER_COLS);
    const left = col * cellWidth;
    const top = row * cellHeight;

    if (slot.logoBuffer) {
      const logoMeta = await sharp(slot.logoBuffer).metadata();
      const logoW = logoMeta.width ?? 180;
      const logoH = logoMeta.height ?? 180;
      composites.push({
        input: slot.logoBuffer,
        left: left + Math.floor((cellWidth - logoW) / 2),
        top: top + 28,
      });
    }

    const cellSvg = buildCellSvg(slot, cellWidth, cellHeight);
    const cellPng = await sharp(cellSvg)
      .resize(cellWidth, cellHeight)
      .png()
      .toBuffer();
    composites.push({ input: cellPng, left, top });
  }

  return sharp(backgroundPath)
    .resize(COVER_WIDTH, COVER_HEIGHT)
    .composite(composites)
    .png()
    .toBuffer();
}

export function hashCoverPng(png: Buffer): string {
  return createHash("sha256").update(png).digest("hex");
}

export async function generateCoverPngFromInputs(
  inputs: CoverSlotInput[],
): Promise<{ png: Buffer; hash: string; slotCount: number }> {
  const slots = await prepareCoverSlots(inputs);
  const png = await generateCoverPng(slots);
  return { png, hash: hashCoverPng(png), slotCount: slots.length };
}
