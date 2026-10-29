import type { EquipmentCategory, EquipmentTracking } from "../equipment-labels";

export type CatalogEntry = {
  name: string;
  prefix: string;
  category: EquipmentCategory;
  tracking: EquipmentTracking;
};

/** Equipment listed in the AMS inventory sheet. Used when no `types.csv` is given. */
export const DEFAULT_EQUIPMENT_CATALOG: readonly CatalogEntry[] = [
  {
    name: "Display SpeedStack G3",
    prefix: "DS3",
    category: "display",
    tracking: "serialized",
  },
  {
    name: "Display QiYi",
    prefix: "DPQ",
    category: "display",
    tracking: "serialized",
  },
  {
    name: "Timer SpeedStack G3",
    prefix: "SG3",
    category: "timer",
    tracking: "serialized",
  },
  {
    name: "Timer SpeedStack G4",
    prefix: "SG4",
    category: "timer",
    tracking: "serialized",
  },
  {
    name: "Timer SpeedStack G5 mat chico",
    prefix: "S5C",
    category: "timer",
    tracking: "serialized",
  },
  {
    name: "Timer SpeedStack G5 mat grande",
    prefix: "S5G",
    category: "timer",
    tracking: "serialized",
  },
  {
    name: "Cronómetro de mano",
    prefix: "CRO",
    category: "timer",
    tracking: "bulk",
  },
  {
    name: "Cable de datos extra",
    prefix: "CAB",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Estuche de cable de datos",
    prefix: "ESC",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Eliminador de corriente extra",
    prefix: "ELI",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Extensión de luz grande (especial)",
    prefix: "EXG",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Extensión de luz chica",
    prefix: "EXC",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Multicontacto",
    prefix: "MUL",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Baterías portátiles",
    prefix: "BAT",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Baterías recargables",
    prefix: "BRC",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Cargador de baterías",
    prefix: "CGB",
    category: "accessory",
    tracking: "bulk",
  },
  {
    name: "Cargador USB múltiple",
    prefix: "CUSB",
    category: "accessory",
    tracking: "bulk",
  },
  { name: "USB", prefix: "USB", category: "accessory", tracking: "bulk" },
  {
    name: "Sujetadores de blindfold",
    prefix: "BLF",
    category: "accessory",
    tracking: "bulk",
  },
  { name: "Cubreweas", prefix: "CUB", category: "accessory", tracking: "bulk" },
  {
    name: "Reglamento para jueces",
    prefix: "REG",
    category: "other",
    tracking: "bulk",
  },
  { name: "Maleta", prefix: "MAL", category: "other", tracking: "bulk" },
  { name: "Impresora", prefix: "IMP", category: "other", tracking: "bulk" },
  { name: "Tablet", prefix: "TAB", category: "other", tracking: "serialized" },
  {
    name: "Base de lonas 230x230",
    prefix: "LON",
    category: "other",
    tracking: "bulk",
  },
  { name: "Guillotina", prefix: "GUI", category: "other", tracking: "bulk" },
  { name: "Desarmador", prefix: "DES", category: "other", tracking: "bulk" },
  {
    name: "Tijeras o cúter",
    prefix: "TIJ",
    category: "other",
    tracking: "bulk",
  },
  { name: "Plumas", prefix: "PLU", category: "other", tracking: "bulk" },
];
