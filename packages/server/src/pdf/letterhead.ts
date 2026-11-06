import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFEmbeddedPage,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import { MEMBRETE_AMS_PDF_BASE64 } from "./membrete-ams";

/** US Letter in points. */
export const LETTER = { width: 612, height: 792 } as const;

/** Space the letterhead artwork occupies (logo on top, corners at the bottom). */
export const LETTERHEAD_MARGINS = {
  top: 155,
  bottom: 120,
  left: 50,
  right: 50,
} as const;

export const PDF_COLORS = {
  navy: rgb(1 / 255, 11 / 255, 25 / 255),
  red: rgb(186 / 255, 12 / 255, 47 / 255),
  green: rgb(0 / 255, 133 / 255, 66 / 255),
  muted: rgb(0.35, 0.4, 0.46),
  rule: rgb(0.82, 0.84, 0.87),
  zebra: rgb(0.96, 0.97, 0.98),
  white: rgb(1, 1, 1),
} as const;

export type ContentBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
};

export type TextOptions = {
  size?: number;
  font?: PDFFont;
  color?: RGB;
};

export type ParagraphOptions = TextOptions & {
  x?: number;
  maxWidth?: number;
  lineGap?: number;
};

let letterheadBytes: Uint8Array | null = null;

function letterheadPdfBytes() {
  letterheadBytes ??= Uint8Array.from(
    Buffer.from(MEMBRETE_AMS_PDF_BASE64, "base64"),
  );
  return letterheadBytes;
}

/**
 * Letter-size document with the AMS letterhead behind every page. Content is
 * laid out top-down with `y`, staying inside `box`; `ensureSpace` starts a
 * new page (with the letterhead) when the next block wouldn't fit.
 */
export class LetterheadDocument {
  readonly box: ContentBox = {
    left: LETTERHEAD_MARGINS.left,
    right: LETTER.width - LETTERHEAD_MARGINS.right,
    top: LETTER.height - LETTERHEAD_MARGINS.top,
    bottom: LETTERHEAD_MARGINS.bottom,
    width: LETTER.width - LETTERHEAD_MARGINS.left - LETTERHEAD_MARGINS.right,
  };

  page!: PDFPage;
  /** Baseline cursor; starts at `box.top` on each page. */
  y = 0;

  private readonly pageListeners: ((doc: LetterheadDocument) => void)[] = [];
  private readonly supported: Set<number>;

  private constructor(
    readonly pdf: PDFDocument,
    readonly fonts: { regular: PDFFont; bold: PDFFont },
    private readonly background: PDFEmbeddedPage,
  ) {
    this.supported = new Set(fonts.regular.getCharacterSet());
  }

  static async create(meta: {
    title: string;
    subject?: string;
    author?: string;
  }) {
    const pdf = await PDFDocument.create();
    const [regular, bold, [background]] = await Promise.all([
      pdf.embedFont(StandardFonts.Helvetica),
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedPdf(letterheadPdfBytes(), [0]),
    ]);
    pdf.setTitle(meta.title);
    if (meta.subject) pdf.setSubject(meta.subject);
    pdf.setAuthor(meta.author ?? "Asociación Mexicana de Speedcubing");
    pdf.setCreator("AMS Cubing");
    const doc = new LetterheadDocument(pdf, { regular, bold }, background!);
    doc.addPage();
    return doc;
  }

  /** Runs after every page break (e.g. to repeat a table header). */
  onNewPage(listener: (doc: LetterheadDocument) => void) {
    this.pageListeners.push(listener);
    return () => {
      const index = this.pageListeners.indexOf(listener);
      if (index >= 0) this.pageListeners.splice(index, 1);
    };
  }

  addPage() {
    this.page = this.pdf.addPage([LETTER.width, LETTER.height]);
    this.page.drawPage(this.background, {
      x: 0,
      y: 0,
      width: LETTER.width,
      height: LETTER.height,
    });
    this.y = this.box.top;
    for (const listener of [...this.pageListeners]) listener(this);
    return this.page;
  }

  /** Starts a new page when `height` points no longer fit; returns whether it did. */
  ensureSpace(height: number) {
    if (this.y - height >= this.box.bottom) return false;
    this.addPage();
    return true;
  }

  moveDown(points: number) {
    this.y -= points;
  }

  /** Replaces characters the standard fonts can't encode (WinAnsi). */
  safe(value: string) {
    let result = "";
    for (const char of value.replace(/\s+/g, " ")) {
      const code = char.codePointAt(0)!;
      if (this.supported.has(code)) {
        result += char;
        continue;
      }
      const base = char.normalize("NFD").charAt(0);
      result += base && this.supported.has(base.codePointAt(0)!) ? base : "?";
    }
    return result;
  }

  widthOf(value: string, size: number, font = this.fonts.regular) {
    return font.widthOfTextAtSize(this.safe(value), size);
  }

  /** Draws one line at an absolute position. */
  text(value: string, x: number, y: number, options: TextOptions = {}) {
    const font = options.font ?? this.fonts.regular;
    const size = options.size ?? 10;
    this.page.drawText(this.safe(value), {
      x,
      y,
      size,
      font,
      color: options.color ?? PDF_COLORS.navy,
    });
  }

  /** Draws one line right-aligned to `right`. */
  textRight(
    value: string,
    right: number,
    y: number,
    options: TextOptions = {},
  ) {
    const size = options.size ?? 10;
    const width = this.widthOf(value, size, options.font);
    this.text(value, right - width, y, options);
  }

  /** Shortens `value` with an ellipsis so it fits in `maxWidth`. */
  fit(
    value: string,
    maxWidth: number,
    size: number,
    font = this.fonts.regular,
  ) {
    const clean = this.safe(value);
    if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
    let end = clean.length;
    while (
      end > 0 &&
      font.widthOfTextAtSize(`${clean.slice(0, end)}…`, size) > maxWidth
    ) {
      end--;
    }
    return `${clean.slice(0, end).trimEnd()}…`;
  }

  wrapText(
    value: string,
    maxWidth: number,
    size: number,
    font = this.fonts.regular,
  ) {
    const lines: string[] = [];
    for (const paragraph of value.split(/\n/)) {
      const words = this.safe(paragraph).split(" ").filter(Boolean);
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
          line = candidate;
        } else {
          lines.push(line);
          line = word;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  /** Wrapped text that flows from `y` and breaks pages as needed. */
  paragraph(value: string, options: ParagraphOptions = {}) {
    const size = options.size ?? 10;
    const font = options.font ?? this.fonts.regular;
    const x = options.x ?? this.box.left;
    const maxWidth = options.maxWidth ?? this.box.right - x;
    const leading = size + (options.lineGap ?? 3);
    for (const line of this.wrapText(value, maxWidth, size, font)) {
      this.ensureSpace(leading);
      this.y -= size;
      this.text(line, x, this.y, { ...options, size, font });
      this.y -= leading - size;
    }
  }

  rule(y = this.y, color: RGB = PDF_COLORS.rule) {
    this.page.drawLine({
      start: { x: this.box.left, y },
      end: { x: this.box.right, y },
      thickness: 0.6,
      color,
    });
  }

  /** Adds "label · Página n de N" in the free bottom-right corner. */
  async save(footerLabel?: string) {
    const pages = this.pdf.getPages();
    const size = 7.5;
    pages.forEach((page, index) => {
      const label = [footerLabel, `Página ${index + 1} de ${pages.length}`]
        .filter(Boolean)
        .join(" · ");
      const text = this.safe(label);
      const width = this.fonts.regular.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: this.box.right - width,
        y: 48,
        size,
        font: this.fonts.regular,
        color: PDF_COLORS.muted,
      });
    });
    return this.pdf.save();
  }
}

export function createLetterheadDocument(meta: {
  title: string;
  subject?: string;
  author?: string;
}) {
  return LetterheadDocument.create(meta);
}
