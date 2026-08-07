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
