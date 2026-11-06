import type {
  EquipmentAcquisitionKind,
  EquipmentCategory,
  EquipmentStatus,
  EquipmentTracking,
} from "./equipment-labels";

/** RFC 4180 CSV: quoted fields, escaped quotes and newlines inside quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((cell) => cell.trim()));
  if (!header) return [];
  const keys = header.map((key) => key.trim().toLowerCase());
  return body.map((cells) =>
    Object.fromEntries(keys.map((key, i) => [key, (cells[i] ?? "").trim()])),
  );
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const STATUS_ALIASES: Record<string, EquipmentStatus> = {
  functional: "functional",
  funcional: "functional",
  faulty: "faulty",
  defectuoso: "faulty",
  in_repair: "in_repair",
  "en reparacion": "in_repair",
  lost: "lost",
  extraviado: "lost",
  retired: "retired",
  baja: "retired",
};

export function parseStatus(value: string): EquipmentStatus {
  if (!value.trim()) return "functional";
  const status = STATUS_ALIASES[normalize(value)];
  if (!status) throw new Error(`Estado desconocido: "${value}"`);
  return status;
}

const CATEGORY_ALIASES: Record<string, EquipmentCategory> = {
  timer: "timer",
  display: "display",
  accessory: "accessory",
  accesorio: "accessory",
  other: "other",
  otro: "other",
};

export function parseCategory(value: string): EquipmentCategory {
  const category = CATEGORY_ALIASES[normalize(value)];
  if (!category) throw new Error(`Categoría desconocida: "${value}"`);
  return category;
}

const TRACKING_ALIASES: Record<string, EquipmentTracking> = {
  serialized: "serialized",
  unidad: "serialized",
  "por unidad": "serialized",
  bulk: "bulk",
  cantidad: "bulk",
  "por cantidad": "bulk",
};

export function parseTracking(value: string): EquipmentTracking {
  const tracking = TRACKING_ALIASES[normalize(value)];
  if (!tracking) throw new Error(`Seguimiento desconocido: "${value}"`);
  return tracking;
}

const MONTHS: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

/**
 * Accepts the sheet's loose dates: `2023-02-15`, `2023-02`, `2018`,
 * `febrero-2023`, `2014-2015` (first year). Missing parts become 01.
 */
export function parseLooseDate(value: string): string {
  const text = normalize(value);
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) return text;
  match = /^(\d{4})-(\d{2})$/.exec(text);
  if (match) return `${match[1]}-${match[2]}-01`;
  match = /^(\d{4})(?:\s*-\s*\d{4})?$/.exec(text);
  if (match) return `${match[1]}-01-01`;
  match = /^([a-z]+)[\s-]+(?:de\s+)?(\d{4})$/.exec(text);
  if (match && MONTHS[match[1]!]) return `${match[2]}-${MONTHS[match[1]!]}-01`;
  throw new Error(`Fecha no reconocida: "${value}"`);
}

/** Guesses the movement kind from the sheet's free-text description. */
export function inferAcquisitionKind(
  description: string,
  totalDelta: number,
): EquipmentAcquisitionKind {
  const text = normalize(description);
  if (totalDelta < 0) return /vend/.test(text) ? "sale" : "disposal";
  if (/patrocin/.test(text)) return "sponsorship";
  if (/dona/.test(text)) return "donation";
  return "purchase";
}

export function inferSource(description: string) {
  const text = normalize(description);
  if (/\bwca\b/.test(text)) return "WCA";
  if (/brick/.test(text)) return "Brick Cubes";
  return "AMS";
}

export function parseQuantity(value: string, label: string): number {
  if (!value.trim()) return 0;
  const quantity = Number(value.replace(/[+\s]/g, ""));
  if (!Number.isInteger(quantity)) {
    throw new Error(`Cantidad inválida en ${label}: "${value}"`);
  }
  return quantity;
}
