import {
  createLetterheadDocument,
  PDF_COLORS,
} from "./letterhead";

export type BudgetSummaryPdfInput = {
  competition: {
    id: number;
    name: string | null;
    city: string;
  };
  budget: {
    id: number;
    status: string;
    proposedRegistrationFeeCents: number;
    expectedCompetitorCount: number;
    payingCompetitorCount?: number | null;
    registrationRevenueCents: number | null;
    receiptsDriveUrl: string | null;
    spreadsheetUrl: string | null;
    remanenteNote: string | null;
    remanenteDecision: string | null;
  };
  lines: {
    kind: "expense" | "income";
    label: string;
    expectedCents: number;
    actualCents: number | null;
    expectedQuantity?: number | null;
    expectedUnitCents?: number | null;
    actualQuantity?: number | null;
    actualUnitCents?: number | null;
    notes?: string | null;
    receiptStatus: string;
    receiptMissingReason: string | null;
  }[];
  sponsors: {
    name: string;
    type: string;
    amountCents: number | null;
  }[];
  summary: {
    expectedExpenseCents: number;
    expectedIncomeCents: number;
    expectedNetCents: number;
    actualExpenseCents: number;
    actualIncomeCents: number;
    actualNetCents: number;
  };
};

function mxn(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

export function budgetSummaryFolio(input: BudgetSummaryPdfInput) {
  return `COS-${input.budget.id}`;
}

export function budgetSummaryFilename(input: BudgetSummaryPdfInput) {
  const slug = (input.competition.name?.trim() || input.competition.city)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `resumen-costos-${slug || "competencia"}-${budgetSummaryFolio(input)}.pdf`;
}

export function budgetSummaryResponse(
  bytes: Uint8Array,
  input: BudgetSummaryPdfInput,
) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${budgetSummaryFilename(input)}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function createBudgetSummaryPdf(
  input: BudgetSummaryPdfInput,
  options: { generatedAt?: Date } = {},
) {
  const competitionName =
    input.competition.name?.trim() || input.competition.city;
  const folio = budgetSummaryFolio(input);
  const doc = await createLetterheadDocument({
    title: `Resumen de costos - ${competitionName}`,
    subject: "Informe financiero de competencia AMS",
  });
  const { box } = doc;

  doc.y -= 16;
  doc.text("RESUMEN DE COSTOS DE COMPETENCIA", box.left, doc.y, {
    size: 14,
    font: doc.fonts.bold,
  });
  doc.textRight(`Folio ${folio}`, box.right, doc.y, {
    size: 9,
    font: doc.fonts.bold,
    color: PDF_COLORS.red,
  });
  doc.moveDown(8);
  doc.paragraph(competitionName, { size: 12, font: doc.fonts.bold });
  const generatedAt = options.generatedAt ?? new Date();
  doc.paragraph(
    `Generado el ${new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    }).format(generatedAt)}`,
    { size: 7.5, color: PDF_COLORS.muted },
  );

  doc.moveDown(6);
  doc.paragraph(
    `Cuota propuesta: ${mxn(input.budget.proposedRegistrationFeeCents)} · Competidores esperados: ${input.budget.expectedCompetitorCount}`,
    { size: 9 },
  );
  if (input.budget.payingCompetitorCount != null) {
    doc.paragraph(
      `Inscritos que pagan (WCA): ${input.budget.payingCompetitorCount}`,
      { size: 9 },
    );
  }
  doc.paragraph(
    `Ingresos de inscripción: ${
      input.budget.registrationRevenueCents != null
        ? mxn(input.budget.registrationRevenueCents)
        : "—"
    }`,
    { size: 9 },
  );
  doc.paragraph(
    `Esperado ${mxn(input.summary.expectedIncomeCents)} − ${mxn(input.summary.expectedExpenseCents)} = ${mxn(input.summary.expectedNetCents)}`,
    { size: 9 },
  );
  doc.paragraph(
    `Real ${mxn(input.summary.actualIncomeCents)} − ${mxn(input.summary.actualExpenseCents)} = ${mxn(input.summary.actualNetCents)}`,
    { size: 9, font: doc.fonts.bold },
  );

  if (input.budget.receiptsDriveUrl) {
    doc.moveDown(4);
    doc.paragraph(`Comprobantes (Drive): ${input.budget.receiptsDriveUrl}`, {
      size: 8,
      color: PDF_COLORS.muted,
    });
  }
  if (input.budget.spreadsheetUrl) {
    doc.paragraph(`Excel respaldo: ${input.budget.spreadsheetUrl}`, {
      size: 8,
      color: PDF_COLORS.muted,
    });
  }

  doc.moveDown(8);
  doc.paragraph("Renglones", { size: 11, font: doc.fonts.bold });
  for (const line of input.lines) {
    doc.ensureSpace(36);
    const actual =
      line.actualCents != null ? mxn(line.actualCents) : "—";
    doc.paragraph(
      `${line.kind === "expense" ? "Gasto" : "Ingreso"} · ${line.label}: esperado ${mxn(line.expectedCents)} / real ${actual}`,
      { size: 8.5 },
    );
    if (
      line.expectedQuantity != null &&
      line.expectedUnitCents != null &&
      line.expectedQuantity > 0
    ) {
      doc.paragraph(
        `Esperado: ${line.expectedQuantity} × ${mxn(line.expectedUnitCents)}`,
        { size: 7.5, color: PDF_COLORS.muted },
      );
    }
    if (
      line.actualQuantity != null &&
      line.actualUnitCents != null &&
      line.actualQuantity > 0
    ) {
      doc.paragraph(
        `Real: ${line.actualQuantity} × ${mxn(line.actualUnitCents)}`,
        { size: 7.5, color: PDF_COLORS.muted },
      );
    }
    if (line.notes?.trim()) {
      doc.paragraph(line.notes.trim(), {
        size: 7.5,
        color: PDF_COLORS.muted,
      });
    }
    if (line.receiptStatus === "missing_reason" && line.receiptMissingReason) {
      doc.paragraph(`Sin comprobante: ${line.receiptMissingReason}`, {
        size: 7.5,
        color: PDF_COLORS.muted,
      });
    }
  }

  if (input.sponsors.length > 0) {
    doc.moveDown(8);
    doc.paragraph("Patrocinadores", { size: 11, font: doc.fonts.bold });
    for (const sponsor of input.sponsors) {
      doc.ensureSpace(20);
      doc.paragraph(
        `${sponsor.name} (${sponsor.type})${
          sponsor.amountCents != null ? ` · ${mxn(sponsor.amountCents)}` : ""
        }`,
        { size: 8.5 },
      );
    }
  }

  if (input.budget.remanenteNote || input.budget.remanenteDecision) {
    doc.moveDown(8);
    doc.paragraph("Remanente", { size: 11, font: doc.fonts.bold });
    if (input.budget.remanenteNote) {
      doc.paragraph(`Propuesta: ${input.budget.remanenteNote}`, { size: 8.5 });
    }
    if (input.budget.remanenteDecision) {
      doc.paragraph(`Decisión: ${input.budget.remanenteDecision}`, {
        size: 8.5,
      });
    }
  }

  return doc.save();
}
