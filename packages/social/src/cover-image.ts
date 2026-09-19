import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

import {
  formatCoverCityLine,
  formatCoverDateRange,
  formatCoverStateLabel,
} from "./format";

export const COVER_WIDTH = 1640;
export const COVER_HEIGHT = 924;
export const COVER_MAX_SLOTS = 9;

const COVER_H_PADDING = 48;
const COVER_V_PADDING = 36;
const ROW_GAP = 28;
const LOGO_TEXT_GAP = 30;
const TEXT_LINE_GAP = 4;
const CELL_BOTTOM_PAD = 18;

const LOGO_FETCH_TIMEOUT_MS = 8_000;
const LOGO_MAX_BYTES = 8 * 1024 * 1024;

const TITLE_YELLOW = "#FFE600";
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
  cityLine: string;
  stateLine: string;
  eventDates: string;
  logoBuffer: Buffer | null;
};

/** Select up to 9 competitions for the cover (already sorted by startDate asc). */
export function selectCoverCompetitions<T>(competitions: T[]): T[] {
  return competitions.slice(0, COVER_MAX_SLOTS);
}

/**
 * Canva-style row packing: one row up to 5; otherwise top = ceil(n/2),
 * bottom = floor(n/2) → 6→3+3, 7→4+3, 8→4+4, 9→5+4.
 */
export function coverRowCounts(slotCount: number): number[] {
  const n = Math.max(0, Math.min(slotCount, COVER_MAX_SLOTS));
  if (n === 0) return [];
  if (n <= 5) return [n];
  const top = Math.ceil(n / 2);
  const bottom = Math.floor(n / 2);
  return [top, bottom];
}

async function fetchLogoBuffer(
  logoUrl: string | null | undefined,
  maxSide: number,
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
      .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

/** Logo max side scales with how dense the densest row will be. */
function logoMaxSideForCount(slotCount: number): number {
  const rows = coverRowCounts(slotCount);
  const maxCols = Math.max(1, ...rows);
  // Logos dominate the cell in Canva; keep them large relative to the text stack.
  if (maxCols >= 5) return 168;
  if (maxCols === 4) return 188;
  if (maxCols === 3) return 210;
  return 230;
}

export async function prepareCoverSlots(
  inputs: CoverSlotInput[],
): Promise<CoverSlot[]> {
  const selected = selectCoverCompetitions(inputs);
  const logoMax = logoMaxSideForCount(selected.length);
  return Promise.all(
    selected.map(async (input) => {
      const cityLine = formatCoverCityLine(input.city, input.stateName);
      const stateLine = formatCoverStateLabel(input.stateName);
      const eventDates = formatCoverDateRange(input.startDate, input.endDate);
      const logoBuffer = await fetchLogoBuffer(input.logoUrl, logoMax);
      return { cityLine, stateLine, eventDates, logoBuffer };
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

/**
 * Canva hierarchy: state (bold caps) is dominant, date is medium, city script
 * is the smallest decorative line under the logo.
 */
function stateFontSize(cols: number): number {
  if (cols >= 5) return 28;
  if (cols === 4) return 32;
  if (cols === 3) return 36;
  return 40;
}

function dateFontSize(cols: number): number {
  // Date sits between script and state — closer to state than script.
  if (cols >= 5) return 22;
  if (cols === 4) return 24;
  if (cols === 3) return 26;
  return 28;
}

/** Script stays clearly smaller than the state line and fits the column. */
function cityFontSize(
  cityLine: string,
  cellWidth: number,
  cols: number,
): number {
  const stateSize = stateFontSize(cols);
  // Script ~55% of state — decorative accent, not competing with caps.
  let size = Math.round(stateSize * 0.55);
  const len = cityLine.length;
  if (len > 18) size = Math.min(size, Math.round(stateSize * 0.45));
  else if (len > 12) size = Math.min(size, Math.round(stateSize * 0.5));

  // Smooth Fantasy is wide; clamp so long cities stay inside the column.
  const estimated = size * 0.62 * Math.max(len, 1);
  const maxWidth = cellWidth - 24;
  if (estimated > maxWidth) {
    size = Math.max(12, Math.floor(maxWidth / (0.62 * Math.max(len, 1))));
  }
  return size;
}

/** Vertical space needed for the three text lines (including baselines). */
function textStackHeight(
  citySize: number,
  stateSize: number,
  dateSize: number,
): number {
  // Script has large descenders; keep room below each baseline.
  return (
    citySize * 1.15 +
    TEXT_LINE_GAP +
    stateSize * 1.05 +
    TEXT_LINE_GAP +
    dateSize * 1.15 +
    CELL_BOTTOM_PAD
  );
}

type CellMetrics = {
  cellWidth: number;
  cellHeight: number;
  cols: number;
  logoHeight: number;
};

function buildCellTextLayers(
  slot: CoverSlot,
  metrics: CellMetrics,
  fonts: ReturnType<typeof resolveCoverFonts>,
): Buffer[] {
  const { cellWidth, cellHeight, cols, logoHeight } = metrics;
  const cx = cellWidth / 2;
  const layers: Buffer[] = [];

  const titleSize = cityFontSize(slot.cityLine, cellWidth, cols);
  const stateSize = stateFontSize(cols);
  const datesSize = dateFontSize(cols);

  // Logos sit at cell top + 8; text begins below that box + gap.
  const logoBlock = slot.logoBuffer ? 8 + logoHeight + LOGO_TEXT_GAP : 16;
  let y = logoBlock + titleSize * 0.82;

  if (slot.cityLine && fonts.script) {
    layers.push(
      renderTextLayer({
        width: cellWidth,
        height: cellHeight,
        text: slot.cityLine,
        x: cx,
        y,
        fontSize: titleSize,
        fill: TITLE_YELLOW,
        font: fonts.script,
        glow: true,
      }),
    );
  }

  // Tight gap under script — Canva keeps state close to the city line.
  y += titleSize * 0.42 + TEXT_LINE_GAP + stateSize * 0.85;

  if (slot.stateLine && fonts.bold) {
    layers.push(
      renderTextLayer({
        width: cellWidth,
        height: cellHeight,
        text: slot.stateLine,
        x: cx,
        y,
        fontSize: stateSize,
        fill: LABEL_WHITE,
        font: fonts.bold,
        glow: true,
      }),
    );
  }

  y += stateSize * 0.28 + TEXT_LINE_GAP + datesSize * 0.9;

  if (slot.eventDates && fonts.bold) {
    layers.push(
      renderTextLayer({
        width: cellWidth,
        height: cellHeight,
        text: slot.eventDates,
        x: cx,
        y,
        fontSize: datesSize,
        fill: LABEL_WHITE,
        font: fonts.bold,
        glow: true,
      }),
    );
  }

  return layers;
}

type LayoutCell = {
  slot: CoverSlot;
  left: number;
  top: number;
  cellWidth: number;
  cellHeight: number;
  cols: number;
};

function layoutCoverCells(slots: CoverSlot[]): LayoutCell[] {
  const rowCounts = coverRowCounts(slots.length);
  if (rowCounts.length === 0) return [];

  const usableWidth = COVER_WIDTH - COVER_H_PADDING * 2;
  const maxCols = Math.max(...rowCounts);
  const cellWidth = Math.floor(usableWidth / maxCols);

  const hasAnyLogo = slots.some((s) => s.logoBuffer != null);
  const logoBudget = hasAnyLogo ? logoMaxSideForCount(slots.length) : 0;
  const titleBudget = cityFontSize("San Andrés Cholula", cellWidth, maxCols);
  const stateBudget = stateFontSize(maxCols);
  const dateBudget = dateFontSize(maxCols);
  const cellHeight = Math.ceil(
    (logoBudget > 0 ? logoBudget + LOGO_TEXT_GAP + 8 : 12) +
      textStackHeight(titleBudget, stateBudget, dateBudget),
  );

  const rowCount = rowCounts.length;
  const blockHeight = rowCount * cellHeight + (rowCount - 1) * ROW_GAP;
  const blockTop = Math.max(
    COVER_V_PADDING,
    Math.floor((COVER_HEIGHT - blockHeight) / 2),
  );

  const cells: LayoutCell[] = [];
  let slotIndex = 0;

  for (let row = 0; row < rowCounts.length; row++) {
    const cols = rowCounts[row]!;
    const rowWidth = cols * cellWidth;
    const rowLeft = Math.floor((COVER_WIDTH - rowWidth) / 2);
    const rowTop = blockTop + row * (cellHeight + ROW_GAP);

    for (let col = 0; col < cols; col++) {
      const slot = slots[slotIndex++];
      if (!slot) break;
      cells.push({
        slot,
        left: rowLeft + col * cellWidth,
        top: rowTop,
        cellWidth,
        cellHeight,
        cols,
      });
    }
  }

  return cells;
}

/**
 * Composite the Torneo de Rubik Facebook cover (1640×924, up to 9 slots).
 * Canva-style: centered rows, city script / state caps / white dates.
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

  const limited = slots.slice(0, COVER_MAX_SLOTS);
  const cells = layoutCoverCells(limited);
  const composites: sharp.OverlayOptions[] = [];

  for (const cell of cells) {
    const { slot, left, top, cellWidth, cellHeight, cols } = cell;
    let logoHeight = 0;

    if (slot.logoBuffer) {
      const logoMeta = await sharp(slot.logoBuffer).metadata();
      const logoW = logoMeta.width ?? 180;
      const logoH = logoMeta.height ?? 180;
      logoHeight = logoH;
      composites.push({
        input: slot.logoBuffer,
        left: left + Math.floor((cellWidth - logoW) / 2),
        top: top + 8,
      });
    }

    for (const layer of buildCellTextLayers(
      slot,
      { cellWidth, cellHeight, cols, logoHeight: logoHeight || 0 },
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
