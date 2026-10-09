import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { CourseCertificate } from "@workspace/db/schema";
import { formatCourseScore } from "./course-score";

export async function createCertificatePdf(certificate: CourseCertificate) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const assets = join(process.cwd(), "public");
  const [copyBytes, displayBytes, logoBytes] = await Promise.all([
    readFile(join(assets, "fonts/Saira.ttf")),
    readFile(join(assets, "fonts/GamingSporty.ttf")),
    readFile(join(assets, "source/imagotipo-sm.png")),
  ]);
  const copy = await pdf.embedFont(copyBytes, { subset: true });
  const display = await pdf.embedFont(displayBytes, { subset: true });
  const logo = await pdf.embedPng(logoBytes);
  const page = pdf.addPage([841.89, 595.28]);
  const navy = rgb(1 / 255, 11 / 255, 25 / 255);
  const red = rgb(186 / 255, 12 / 255, 47 / 255);
  const muted = rgb(0.35, 0.4, 0.46);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 842,
    height: 595.28,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({ x: 0, y: 579, width: 842, height: 16.28, color: navy });
  page.drawRectangle({ x: 0, y: 573, width: 842, height: 6, color: red });
  page.drawSvgPath(
    "M 0 0 L 74 0 L 74 573 L 0 573 L 28 490 L 0 408 L 28 326 L 0 244 L 28 162 L 0 80 Z",
    {
      x: 768,
      y: 573,
      color: navy,
    },
  );
  page.drawImage(logo, {
    x: 56,
    y: 477,
    width: 152,
    height: (152 / logo.width) * logo.height,
  });
  const text = (
    value: string,
    x: number,
    y: number,
    size = 12,
    font: PDFFont = copy,
    color = navy,
  ) => page.drawText(value, { x, y, size, font, color });
  text("FORMACIÓN · COMUNIDAD · SPEEDCUBING", 332, 510, 11, copy, muted);
  text("CERTIFICADO", 56, 421, 48, display);
  text("DE FINALIZACIÓN", 58, 396, 15, copy, red);
  text(
    "La Asociación Mexicana de Speedcubing reconoce a",
    58,
    350,
    14,
    copy,
    muted,
  );

  function fittedLines(
    value: string,
    y: number,
    preferred: number,
    minimum: number,
    maxLines: number,
  ) {
    const words = value.replace(/\s+/g, " ").trim().split(" ");
    let size = preferred;
    let lines: string[] = [];
    while (size >= minimum) {
      lines = [""];
      for (const word of words) {
        const i = lines.length - 1;
        const candidate = lines[i] ? `${lines[i]} ${word}` : word;
        if (copy.widthOfTextAtSize(candidate, size) <= 666)
          lines[i] = candidate;
        else if (!lines[i]) {
          lines[i] = word;
        } else lines.push(word);
      }
      if (
        lines.length <= maxLines &&
        lines.every((l) => copy.widthOfTextAtSize(l, size) <= 666)
      )
        break;
      size -= 1;
    }
    // Editors can enter long titles; shrink further rather than clip their text.
    if (
      lines.length > maxLines ||
      lines.some((l) => copy.widthOfTextAtSize(l, size) > 666)
    ) {
      lines = [value.replace(/\s+/g, " ").trim()];
      size = Math.min(minimum, 666 / copy.widthOfTextAtSize(lines[0]!, 1));
    }
    lines.forEach((line, index) =>
      text(line, 58, y - index * (size + 5), size),
    );
  }
  fittedLines(certificate.name, 309, 30, 20, 2);
  page.drawLine({
    start: { x: 58, y: 250 },
    end: { x: 722, y: 250 },
    thickness: 0.7,
    color: rgb(0.85, 0.87, 0.89),
  });
  text("por completar satisfactoriamente el curso", 58, 225, 14, copy, muted);
  fittedLines(certificate.courseTitle, 193, 22, 14, 2);
  const date = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Mexico_City",
  }).format(new Date(certificate.completedAt));
  text("FECHA DE FINALIZACIÓN", 58, 110, 9, copy, muted);
  text(date, 58, 89, 13);
  if (certificate.wcaId)
    text(`WCA ID: ${certificate.wcaId}`, 58, 66, 10, copy, muted);
  page.drawRectangle({ x: 498, y: 62, width: 224, height: 68, color: red });
  text("PUNTUACIÓN DEL CURSO", 514, 109, 10, copy, rgb(1, 1, 1));
  text(
    formatCourseScore(certificate),
    514,
    80,
    certificate.score === null ? 12 : 25,
    copy,
    rgb(1, 1, 1),
  );
  text(`Folio: ${certificate.folio}`, 58, 30, 8, copy, muted);
  text("amscubing.org", 627, 30, 10, copy, muted);
  pdf.setTitle(`Certificado AMS - ${certificate.courseTitle}`);
  pdf.setAuthor("Asociación Mexicana de Speedcubing");
  pdf.setCreationDate(new Date(certificate.issuedAt));
  pdf.setModificationDate(new Date(certificate.issuedAt));
  return pdf.save();
}
