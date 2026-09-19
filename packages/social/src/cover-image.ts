import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";
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

/**
 * Family names must match the TTF `name` table (id 1). Sharp/librsvg ignores
 * `@font-face` data URLs, so cell text is rendered with resvg + one font file
 * at a time (loading several fonts together makes resvg mis-fallback).
 */
const COVER_FONTS = {
  script: {
    files: [
      "SmoothFantasy.ttf",
      "SmoothFantasy.otf",
      "Smooth Fantasy.ttf",
      "Smooth Fantasy.otf",
    ],
    family: "Smooth Fantasy Personal Use Onl",
  },
  bold: {
    files: [
      "CodecPro-ExtraBold.ttf",
      "CodecProExtraBold.ttf",
      "Codec Pro ExtraBold.ttf",
      "CodecPro-Bold.ttf",
    ],
    family: "Codec Pro ExtraBold",
  },
  regular: {
    files: [
      "CodecPro.ttf",
      "CodecPro-Regular.ttf",
      "Codec Pro.ttf",
      "CodecProRegular.ttf",
    ],
    family: "Codec Pro",
  },
} as const;

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

function findFontFile(candidates: readonly string[]): string | null {
  const fontsDir = path.join(resolveAssetsDir(), "fonts");
  for (const name of candidates) {
    const full = path.join(fontsDir, name);
    if (existsSync(full)) return full;
  }
  const fallback = path.join(fontsDir, "GamingSporty.ttf");
  return existsSync(fallback) ? fallback : null;
}

type ResolvedCoverFont = {
  path: string;
  family: string;
};

function resolveCoverFonts(): {
  script: ResolvedCoverFont | null;
  bold: ResolvedCoverFont | null;
  regular: ResolvedCoverFont | null;
} {
  const scriptPath = findFontFile(COVER_FONTS.script.files);
  const boldPath = findFontFile(COVER_FONTS.bold.files);
  const regularPath = findFontFile(COVER_FONTS.regular.files);
  return {
    script: scriptPath
      ? { path: scriptPath, family: COVER_FONTS.script.family }
      : null,
    bold: boldPath ? { path: boldPath, family: COVER_FONTS.bold.family } : null,
    regular: regularPath
      ? { path: regularPath, family: COVER_FONTS.regular.family }
      : null,
  };
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

function renderTextLayer(options: {
  width: number;
  height: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  font: ResolvedCoverFont;
  letterSpacingEm?: number;
  glow?: boolean;
}): Buffer {
  const letterSpacing =
    options.letterSpacingEm != null
      ? ` letter-spacing="${options.letterSpacingEm}em"`
      : "";
  const filterAttr = options.glow ? ` filter="url(#glow)"` : "";
  const glowFilter = options.glow
    ? `<filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="cellClip">
      <rect x="0" y="0" width="${options.width}" height="${options.height}"/>
    </clipPath>
    ${glowFilter}
  </defs>
  <g clip-path="url(#cellClip)">
    <text x="${options.x}" y="${options.y}" text-anchor="middle"
      font-family="${escapeXml(options.font.family)}"
      font-size="${options.fontSize}px"
      fill="${options.fill}"${letterSpacing}${filterAttr}>${escapeXml(options.text)}</text>
  </g>
</svg>`;

  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [options.font.path],
      loadSystemFonts: false,
      defaultFontFamily: options.font.family,
    },
  });
  return Buffer.from(resvg.render().asPng());
}

/** Keep place titles inside a column (~546px) with the script face. */
function placeFontSize(placeLine: string): number {
  const len = placeLine.length;
  if (len > 28) return 26;
  if (len > 22) return 30;
  if (len > 16) return 36;
  return 42;
}

function buildCellTextLayers(
  slot: CoverSlot,
  cellWidth: number,
  cellHeight: number,
  fonts: ReturnType<typeof resolveCoverFonts>,
): Buffer[] {
  const cx = cellWidth / 2;
  const textTop = slot.logoBuffer ? 250 : 120;
  const layers: Buffer[] = [];
  const titleSize = placeFontSize(slot.placeLine);

  if (slot.placeLine && fonts.script) {
    layers.push(
      renderTextLayer({
        width: cellWidth,
        height: cellHeight,
        text: slot.placeLine,
        x: cx,
        y: textTop,
        fontSize: titleSize,
        fill: TITLE_YELLOW,
        font: fonts.script,
        glow: true,
      }),
    );
  }

  if (slot.eventDates && fonts.bold) {
    layers.push(
      renderTextLayer({
        width: cellWidth,
        height: cellHeight,
        text: slot.eventDates,
        x: cx,
        y: textTop + Math.round(titleSize * 1.15),
        fontSize: 26,
        fill: DATE_MAGENTA,
        font: fonts.bold,
      }),
    );
  }

  if (slot.registrationDates && fonts.regular) {
    const regTop = textTop + Math.round(titleSize * 1.15) + 36;
    layers.push(
      renderTextLayer({
        width: cellWidth,
        height: cellHeight,
        text: "REGISTRO",
        x: cx,
        y: regTop,
        fontSize: 16,
        fill: LABEL_WHITE,
        font: fonts.regular,
        letterSpacingEm: 0.12,
      }),
      renderTextLayer({
        width: cellWidth,
        height: cellHeight,
        text: slot.registrationDates,
        x: cx,
        y: regTop + 28,
        fontSize: 18,
        fill: LABEL_WHITE,
        font: fonts.regular,
      }),
    );
  }

  return layers;
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

  const fonts = resolveCoverFonts();
  if (!fonts.script || !fonts.bold || !fonts.regular) {
    throw new Error(
      "Faltan tipografías de portada en packages/social/assets/fonts (SmoothFantasy, CodecPro-ExtraBold, CodecPro).",
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

    for (const layer of buildCellTextLayers(
      slot,
      cellWidth,
      cellHeight,
      fonts,
    )) {
      composites.push({ input: layer, left, top });
    }
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
