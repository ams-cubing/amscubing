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
