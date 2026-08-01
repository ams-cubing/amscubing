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
    mapColor: "#f59e0b",
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
    mapColor: "#ef4444",
    states: [
      { id: "CMX", name: "Ciudad de México" },
      { id: "MEX", name: "Estado de México" },
      { id: "MOR", name: "Morelos" },
    ],
  },
  {
    id: "noreste",
    displayName: "Noreste",
    mapColor: "#8b5cf6",
    states: [
      { id: "COA", name: "Coahuila" },
      { id: "NLE", name: "Nuevo León" },
      { id: "TAM", name: "Tamaulipas" },
    ],
  },
  {
    id: "noroeste",
    displayName: "Noroeste",
    mapColor: "#3b82f6",
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
    mapColor: "#10b981",
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
    mapColor: "#ec4899",
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
    mapColor: "#06b6d4",
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
    mapColor: "#84cc16",
    states: [
      { id: "CHP", name: "Chiapas" },
      { id: "GRO", name: "Guerrero" },
      { id: "OAX", name: "Oaxaca" },
    ],
  },
];

export const MEXICAN_STATES: MexicoState[] = MEXICO_REGIONS.flatMap(
  (region) => region.states,
);
