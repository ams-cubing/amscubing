export type MexicoState = {
  id: string;
  name: string;
};

export type MexicoRegion = {
  id: string;
  displayName: string;
  mapColor: string;
  states: MexicoState[];
};

export const MEXICO_REGIONS: MexicoRegion[] = [
  {
    id: "bajio",
    displayName: "Bajío",
    mapColor: "#86EFAC",
    states: [
      { id: "AGU", name: "Aguascalientes" },
      { id: "GUA", name: "Guanajuato" },
      { id: "QUE", name: "Querétaro" },
      { id: "SLP", name: "San Luis Potosí" },
      { id: "ZAC", name: "Zacatecas" },
    ],
  },
  {
    id: "centro",
    displayName: "Centro",
    mapColor: "#67E8F9",
    states: [
      { id: "CMX", name: "Ciudad de México" },
      { id: "MEX", name: "Estado de México" },
      { id: "MOR", name: "Morelos" },
    ],
  },
  {
    id: "noreste",
    displayName: "Noreste",
    mapColor: "#FDBA74",
    states: [
      { id: "COA", name: "Coahuila" },
      { id: "NLE", name: "Nuevo León" },
      { id: "TAM", name: "Tamaulipas" },
    ],
  },
  {
    id: "noroeste",
    displayName: "Noroeste",
    mapColor: "#FCA5A5",
    states: [
      { id: "BCN", name: "Baja California" },
      { id: "BCS", name: "Baja California Sur" },
      { id: "CHH", name: "Chihuahua" },
      { id: "DUR", name: "Durango" },
      { id: "SIN", name: "Sinaloa" },
      { id: "SON", name: "Sonora" },
    ],
  },
  {
    id: "occidente",
    displayName: "Occidente",
    mapColor: "#FDE047",
    states: [
      { id: "COL", name: "Colima" },
      { id: "JAL", name: "Jalisco" },
      { id: "MIC", name: "Michoacán" },
      { id: "NAY", name: "Nayarit" },
    ],
  },
  {
    id: "oriente",
    displayName: "Oriente",
    mapColor: "#BEF264",
    states: [
      { id: "HID", name: "Hidalgo" },
      { id: "PUE", name: "Puebla" },
      { id: "TLA", name: "Tlaxcala" },
      { id: "VER", name: "Veracruz" },
    ],
  },
  {
    id: "sureste",
    displayName: "Sureste",
    mapColor: "#93C5FD",
    states: [
      { id: "CAM", name: "Campeche" },
      { id: "ROO", name: "Quintana Roo" },
      { id: "TAB", name: "Tabasco" },
      { id: "YUC", name: "Yucatán" },
    ],
  },
  {
    id: "suroeste",
    displayName: "Suroeste",
    mapColor: "#C4B5FD",
    states: [
      { id: "CHP", name: "Chiapas" },
      { id: "GRO", name: "Guerrero" },
      { id: "OAX", name: "Oaxaca" },
    ],
  },
];

export const MEXICAN_STATES: MexicoState[] = MEXICO_REGIONS.flatMap(
  (region) => region.states,
).sort((a, b) => a.name.localeCompare(b.name, "es"));

const STATE_BY_ID = new Map(MEXICAN_STATES.map((state) => [state.id, state]));

const REGION_BY_STATE_ID = new Map(
  MEXICO_REGIONS.flatMap((region) =>
    region.states.map((state) => [state.id, region.id] as const),
  ),
);

const REGION_BY_ID = new Map(
  MEXICO_REGIONS.map((region) => [region.id, region]),
);

/** Fold accents/case for matching WCA city strings. */
export function normalizeMexicoPlaceKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Extra spellings that show up in WCA `city` fields. */
const STATE_NAME_ALIASES: Record<string, string> = {
  "ciudad de mexico": "CMX",
  "mexico city": "CMX",
  cdmx: "CMX",
  df: "CMX",
  "distrito federal": "CMX",
  "estado de mexico": "MEX",
  "mexico state": "MEX",
  "edomex": "MEX",
  "nuevo leon": "NLE",
  queretaro: "QUE",
  michoacan: "MIC",
  yucatan: "YUC",
  "san luis potosi": "SLP",
  "baja california": "BCN",
  "baja california sur": "BCS",
  "quintana roo": "ROO",
  // City-only WCA strings (no state segment).
  tijuana: "BCN",
  mexicali: "BCN",
  ensenada: "BCN",
  monterrey: "NLE",
  "san pedro garza garcia": "NLE",
  guadalajara: "JAL",
  zapopan: "JAL",
  tonala: "JAL",
  tlajomulco: "JAL",
  puebla: "PUE",
  "san andres cholula": "PUE",
  tehuacan: "PUE",
  merida: "YUC",
  cancun: "ROO",
  "playa del carmen": "ROO",
  leon: "GUA",
  irapuato: "GUA",
  celaya: "GUA",
  salamanca: "GUA",
  guanajuato: "GUA",
  morelia: "MIC",
  oaxaca: "OAX",
  "oaxaca de juarez": "OAX",
  tepic: "NAY",
  "nuevo vallarta": "NAY",
  mazatlan: "SIN",
  "los mochis": "SIN",
  ahome: "SIN",
  hermosillo: "SON",
  culiacan: "SIN",
  "aguascalientes": "AGU",
  tlaxcala: "TLA",
  "santiago de queretaro": "QUE",
  "cuautitlan izcalli": "MEX",
  coacalco: "MEX",
  chiconcuac: "MEX",
  "naucalpan de juarez": "MEX",
};

const STATE_LOOKUP = (() => {
  const map = new Map<string, string>();
  for (const state of MEXICAN_STATES) {
    map.set(normalizeMexicoPlaceKey(state.name), state.id);
    map.set(normalizeMexicoPlaceKey(state.id), state.id);
  }
  for (const [alias, stateId] of Object.entries(STATE_NAME_ALIASES)) {
    map.set(normalizeMexicoPlaceKey(alias), stateId);
  }
  return map;
})();

export function regionIdForState(stateId: string): string | null {
  return REGION_BY_STATE_ID.get(stateId) ?? null;
}

export function mexicoRegionById(regionId: string): MexicoRegion | null {
  return REGION_BY_ID.get(regionId) ?? null;
}

export function mexicoStateById(stateId: string): MexicoState | null {
  return STATE_BY_ID.get(stateId) ?? null;
}

/**
 * Resolve AMS state id from a WCA competition `city` string
 * (usually `"City, State, Mexico"`).
 */
export function resolveMexicoStateFromWcaCity(
  city: string | null | undefined,
): string | null {
  if (!city?.trim()) return null;
  const parts = city
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // Prefer middle segment(s) before trailing country.
  const candidates =
    parts.length >= 2
      ? [...parts.slice(0, -1).reverse(), ...parts]
      : parts;
  for (const candidate of candidates) {
    const key = normalizeMexicoPlaceKey(candidate);
    const direct = STATE_LOOKUP.get(key);
    if (direct) return direct;
  }
  // Last resort: substring search for long state names inside the whole city.
  const full = normalizeMexicoPlaceKey(city);
  for (const state of MEXICAN_STATES) {
    const nameKey = normalizeMexicoPlaceKey(state.name);
    if (nameKey.length >= 5 && full.includes(nameKey)) return state.id;
  }
  for (const [alias, stateId] of Object.entries(STATE_NAME_ALIASES)) {
    const aliasKey = normalizeMexicoPlaceKey(alias);
    if (aliasKey.length >= 4 && full.includes(aliasKey)) return stateId;
  }
  return null;
}

export function resolveMexicoRegionFromWcaCity(
  city: string | null | undefined,
): string | null {
  const stateId = resolveMexicoStateFromWcaCity(city);
  return stateId ? regionIdForState(stateId) : null;
}

/** State-name spellings only (not city aliases like "Tijuana" → BCN). */
const STATE_DISPLAY_ALIASES: Record<string, string[]> = {
  CMX: ["ciudad de mexico", "mexico city", "cdmx", "df", "distrito federal"],
  MEX: ["estado de mexico", "mexico state", "edomex"],
  NLE: ["nuevo leon"],
  QUE: ["queretaro"],
  MIC: ["michoacan"],
  YUC: ["yucatan"],
  SLP: ["san luis potosi"],
  BCN: ["baja california"],
  BCS: ["baja california sur"],
  ROO: ["quintana roo"],
};

/**
 * Display city for AMS from a WCA `city` string.
 * Prefer the first comma segment, then strip any remaining state name/alias.
 */
export function displayCityFromWcaCity(
  wcaCity: string | null | undefined,
): string | null {
  if (!wcaCity?.trim()) return null;

  const trimmed = wcaCity.trim();
  const firstSegment = trimmed.split(",")[0]?.trim() || trimmed;
  const stateId = resolveMexicoStateFromWcaCity(trimmed);
  if (!stateId) return firstSegment;

  const stripped = stripStateNameFromCity(firstSegment, stateId);
  return stripped.length > 0 ? stripped : firstSegment;
}

function stripStateNameFromCity(city: string, stateId: string): string {
  const state = mexicoStateById(stateId);
  const labels = new Set<string>();
  if (state) labels.add(normalizeMexicoPlaceKey(state.name));
  for (const alias of STATE_DISPLAY_ALIASES[stateId] ?? []) {
    labels.add(normalizeMexicoPlaceKey(alias));
  }

  // Prefer longer labels so "estado de mexico" wins over shorter fragments.
  const ordered = [...labels]
    .filter((label) => label.length > 0)
    .sort((a, b) => b.length - a.length);

  let remaining = city.trim();
  for (const label of ordered) {
    const without = removeNormalizedSubstring(remaining, label);
    if (without !== null && without !== remaining) {
      remaining = without;
      break;
    }
  }

  return remaining
    .replace(/^[\s,.\-/]+|[\s,.\-/]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Remove the first occurrence of a normalized label from an original string. */
function removeNormalizedSubstring(
  original: string,
  normalizedLabel: string,
): string | null {
  const tokens = normalizedLabel.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  // Match token sequence against original words (accent/case folded).
  const wordRe = /[A-Za-zÀ-ÿ0-9]+/g;
  const words: { text: string; start: number; end: number; key: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = wordRe.exec(original)) !== null) {
    words.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      key: normalizeMexicoPlaceKey(match[0]),
    });
  }

  for (let i = 0; i <= words.length - tokens.length; i += 1) {
    let ok = true;
    for (let j = 0; j < tokens.length; j += 1) {
      if (words[i + j]!.key !== tokens[j]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const from = words[i]!.start;
    const to = words[i + tokens.length - 1]!.end;
    return `${original.slice(0, from)}${original.slice(to)}`;
  }

  return null;
}
