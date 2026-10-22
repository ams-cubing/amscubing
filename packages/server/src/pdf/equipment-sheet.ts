import {
  createLetterheadDocument,
  PDF_COLORS,
  type LetterheadDocument,
} from "./letterhead";

type SheetPerson = { name: string; wcaId: string | null };

/** Structural subset of `CompetitionEquipmentSheet` from `@workspace/db/equipment`. */
export type EquipmentSheetInput = {
  competition: {
    id: number;
    name: string | null;
    city: string;
    stateName: string;
    startDate: string;
    endDate: string;
  };
  primaryDelegate: SheetPerson | null;
  primaryOrganizer: SheetPerson | null;
  request: {
    id: number;
    status: string;
    notes: string | null;
    lines: { typeName: string; quantity: number }[];
  } | null;
  confirmation: {
    lines: {
      typeName: string;
      sku: string | null;
      quantity: number;
      guardian: { name: string };
    }[];
  } | null;
};

export type EquipmentSheetRow = {
  equipment: string;
  identifier: string;
  carrier: string;
};

export const EQUIPMENT_SHEET_CLAUSE =
  "El cuidado del equipo es responsabilidad de los organizadores. Cualquier daño o pérdida será responsabilidad de quienes lo reciban. Marca cada renglón al entregar y al devolver; anota en Observaciones cualquier faltante o daño.";

/** Confirmed units once the delegate confirms; otherwise the requested quantities. */
export function equipmentSheetRows(sheet: EquipmentSheetInput): {
  rows: EquipmentSheetRow[];
  pending: boolean;
} {
  if (sheet.confirmation && sheet.confirmation.lines.length > 0) {
    return {
      pending: false,
      rows: sheet.confirmation.lines.map((line) => ({
        equipment: line.typeName,
        identifier: line.sku ?? `${line.quantity} pzas.`,
        carrier: line.guardian.name,
      })),
    };
  }
  if (sheet.request && sheet.request.status !== "cancelled") {
    return {
      pending: true,
      rows: sheet.request.lines.map((line) => ({
        equipment: line.typeName,
        identifier: `${line.quantity} pzas.`,
        carrier: "Por confirmar",
      })),
    };
  }
  return { pending: false, rows: [] };
}

export function equipmentSheetFolio(sheet: EquipmentSheetInput) {
  return sheet.request
    ? `EQ-${sheet.request.id}`
    : `EQ-C${sheet.competition.id}`;
}

/** ASCII file name such as `ficha-equipo-torneo-de-rubik-queretaro-EQ-3.pdf`. */
export function equipmentSheetFilename(sheet: EquipmentSheetInput) {
  const slug = (sheet.competition.name?.trim() || sheet.competition.city)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `ficha-equipo-${slug || "competencia"}-${equipmentSheetFolio(sheet)}.pdf`;
}

/** Response headers for serving the sheet from a route handler. */
export function equipmentSheetResponse(
  bytes: Uint8Array,
  sheet: EquipmentSheetInput,
) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${equipmentSheetFilename(sheet)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const longDate = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDay(value: string) {
  return longDate.format(new Date(`${value}T00:00:00Z`));
}

function formatRange(start: string, end: string) {
  return start === end
    ? formatDay(start)
    : `${formatDay(start)} – ${formatDay(end)}`;
}

function personLabel(person: SheetPerson | null) {
  if (!person) return "Sin asignar";
  return person.wcaId ? `${person.name} (${person.wcaId})` : person.name;
}

const COLUMNS = [
  { key: "index", label: "#", width: 22 },
  { key: "equipment", label: "Equipo", width: 150 },
  { key: "identifier", label: "SKU / Cant.", width: 74 },
  { key: "carrier", label: "Lo lleva", width: 96 },
  { key: "delivered", label: "Entregado", width: 50 },
  { key: "returned", label: "Devuelto", width: 50 },
  { key: "notes", label: "Observaciones", width: 70 },
] as const;

const HEADER_HEIGHT = 18;
const ROW_HEIGHT = 18;

function drawTableHeader(doc: LetterheadDocument) {
  const top = doc.y;
  doc.page.drawRectangle({
    x: doc.box.left,
    y: top - HEADER_HEIGHT,
    width: doc.box.width,
    height: HEADER_HEIGHT,
    color: PDF_COLORS.navy,
  });
  let x = doc.box.left;
  for (const column of COLUMNS) {
    doc.text(column.label, x + 4, top - 12, {
      size: 7.5,
      font: doc.fonts.bold,
      color: PDF_COLORS.white,
    });
    x += column.width;
  }
  doc.y = top - HEADER_HEIGHT;
}

function drawCheckbox(doc: LetterheadDocument, x: number, width: number) {
  const size = 8;
  doc.page.drawRectangle({
    x: x + (width - size) / 2,
    y: doc.y - ROW_HEIGHT / 2 - size / 2,
    width: size,
    height: size,
    borderColor: PDF_COLORS.navy,
    borderWidth: 0.7,
  });
}

function drawRow(
  doc: LetterheadDocument,
  row: EquipmentSheetRow,
  index: number,
) {
  if (index % 2 === 1) {
    doc.page.drawRectangle({
      x: doc.box.left,
      y: doc.y - ROW_HEIGHT,
      width: doc.box.width,
      height: ROW_HEIGHT,
      color: PDF_COLORS.zebra,
    });
  }
  const baseline = doc.y - 12;
  let x = doc.box.left;
  for (const column of COLUMNS) {
    const inner = column.width - 8;
    if (column.key === "delivered" || column.key === "returned") {
      drawCheckbox(doc, x, column.width);
    } else if (column.key !== "notes") {
      const value =
        column.key === "index" ? String(index + 1) : row[column.key];
      doc.text(doc.fit(value, inner, 8.5), x + 4, baseline, {
        size: 8.5,
        color: column.key === "index" ? PDF_COLORS.muted : PDF_COLORS.navy,
      });
    }
    x += column.width;
  }
  doc.y -= ROW_HEIGHT;
  doc.rule(doc.y);
}

function drawSignatureBlock(
  doc: LetterheadDocument,
  title: string,
  description: string,
  sheet: EquipmentSheetInput,
) {
  const height = 120;
  doc.ensureSpace(height);
  doc.moveDown(20);
  doc.text(title, doc.box.left, doc.y, {
    size: 10,
    font: doc.fonts.bold,
    color: PDF_COLORS.red,
  });
  doc.moveDown(4);
  doc.paragraph(description, { size: 8.5, color: PDF_COLORS.muted });

  const lineY = doc.y - 44;
  const gap = 32;
  const columnWidth = (doc.box.width - gap) / 2;
  const signers = [
    { role: "Delegado principal", person: sheet.primaryDelegate },
    { role: "Organizador principal", person: sheet.primaryOrganizer },
  ];
  signers.forEach((signer, index) => {
    const x = doc.box.left + index * (columnWidth + gap);
    doc.page.drawLine({
      start: { x, y: lineY },
      end: { x: x + columnWidth, y: lineY },
      thickness: 0.8,
      color: PDF_COLORS.navy,
    });
    doc.text(
      doc.fit(personLabel(signer.person), columnWidth, 9, doc.fonts.bold),
      x,
      lineY - 12,
      { size: 9, font: doc.fonts.bold },
    );
    doc.text(`${signer.role} · Firma`, x, lineY - 23, {
      size: 7.5,
      color: PDF_COLORS.muted,
    });
    doc.text("Fecha: ____________________", x, lineY - 36, {
      size: 8,
      color: PDF_COLORS.muted,
    });
  });
  doc.y = lineY - 44;
}

export async function createEquipmentSheetPdf(
  sheet: EquipmentSheetInput,
  options: { generatedAt?: Date } = {},
) {
  const competitionName =
    sheet.competition.name?.trim() || sheet.competition.city;
  const folio = equipmentSheetFolio(sheet);
  const doc = await createLetterheadDocument({
    title: `Ficha de equipo - ${competitionName}`,
    subject: "Entrega y devolución de equipo de competencia",
  });
  const { box } = doc;

  doc.y -= 16;
  doc.text("FICHA DE EQUIPO DE COMPETENCIA", box.left, doc.y, {
    size: 15,
    font: doc.fonts.bold,
  });
  doc.textRight(`Folio ${folio}`, box.right, doc.y, {
    size: 9,
    font: doc.fonts.bold,
    color: PDF_COLORS.red,
  });
  doc.moveDown(8);
  doc.paragraph(competitionName, { size: 12, font: doc.fonts.bold });
  doc.paragraph(
    `${sheet.competition.city}, ${sheet.competition.stateName} · ${formatRange(
      sheet.competition.startDate,
      sheet.competition.endDate,
    )}`,
    { size: 9.5, color: PDF_COLORS.muted },
  );
  const generatedAt = options.generatedAt ?? new Date();
  doc.paragraph(
    `Generada el ${new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    }).format(generatedAt)}`,
    { size: 7.5, color: PDF_COLORS.muted },
  );

  doc.moveDown(8);
  const half = (box.width - 24) / 2;
  const peopleY = doc.y - 9;
  doc.text("DELEGADO PRINCIPAL", box.left, peopleY, {
    size: 7,
    font: doc.fonts.bold,
    color: PDF_COLORS.muted,
  });
  doc.text("ORGANIZADOR PRINCIPAL", box.left + half + 24, peopleY, {
    size: 7,
    font: doc.fonts.bold,
    color: PDF_COLORS.muted,
  });
  doc.text(
    doc.fit(personLabel(sheet.primaryDelegate), half, 10),
    box.left,
    peopleY - 13,
  );
  doc.text(
    doc.fit(personLabel(sheet.primaryOrganizer), half, 10),
    box.left + half + 24,
    peopleY - 13,
  );
  doc.y = peopleY - 24;

  const { rows, pending } = equipmentSheetRows(sheet);
  if (pending) {
    doc.moveDown(4);
    doc.paragraph(
      "Pendiente de confirmar SKUs: el delegado aún no confirma el equipo, así que la lista refleja la solicitud de los organizadores.",
      { size: 8.5, font: doc.fonts.bold, color: PDF_COLORS.red },
    );
  }

  doc.moveDown(10);
  if (rows.length === 0) {
    doc.paragraph(
      "Aún no hay equipo solicitado ni confirmado para esta competencia.",
      {
        size: 10,
        color: PDF_COLORS.muted,
      },
    );
  } else {
    doc.ensureSpace(HEADER_HEIGHT + ROW_HEIGHT);
    drawTableHeader(doc);
    const stopRepeating = doc.onNewPage(drawTableHeader);
    rows.forEach((row, index) => {
      doc.ensureSpace(ROW_HEIGHT);
      drawRow(doc, row, index);
    });
    stopRepeating();
    doc.moveDown(12);
    doc.textRight(`Total: ${rows.length} renglones`, box.right, doc.y, {
      size: 8,
      color: PDF_COLORS.muted,
    });
  }

  if (sheet.request?.notes) {
    doc.moveDown(14);
    doc.paragraph("Notas de la solicitud", {
      size: 8.5,
      font: doc.fonts.bold,
    });
    doc.paragraph(sheet.request.notes, { size: 8.5 });
  }

  doc.moveDown(14);
  doc.paragraph(EQUIPMENT_SHEET_CLAUSE, { size: 8.5, color: PDF_COLORS.muted });

  drawSignatureBlock(
    doc,
    "ENTREGA",
    "El organizador principal recibe del delegado el equipo marcado en la columna Entregado.",
    sheet,
  );
  drawSignatureBlock(
    doc,
    "DEVOLUCIÓN",
    "El delegado recibe de vuelta el equipo marcado en la columna Devuelto; las observaciones describen faltantes o daños.",
    sheet,
  );

  return doc.save(`Ficha de equipo ${folio}`);
}
