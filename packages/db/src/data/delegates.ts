export type SeedDelegate = {
  wcaId: string;
  name: string;
  email: string;
  /** AMS calendar region id from MEXICO_REGIONS. */
  regionId: string;
  /** Public-facing WCA title shown on the marketing site. */
  title: string;
  /** Public-facing location label shown on the marketing site. */
  location: string;
};

export const SEED_DELEGATES: SeedDelegate[] = [
  {
    name: "Areli Rubí Gordillo Martínez",
    wcaId: "2014MART08",
    email: "amartinez@worldcubeassociation.org",
    regionId: "oriente",
    title: "Delegado Regional MCA",
    location: "México y Centro América",
  },
  {
    name: "Carlos Ricardo Chin Dzul",
    wcaId: "2014DZUL02",
    email: "cdzul@worldcubeassociation.org",
    regionId: "sureste",
    title: "Delegado Junior",
    location: "Mérida — Sureste",
  },
  {
    name: "Christofer Alejandro Aguirre Robledo",
    wcaId: "2016ROBL05",
    email: "crobledo@worldcubeassociation.org",
    regionId: "noroeste",
    title: "Delegado y Miembro del WCAT",
    location: "Baja California — Noroeste",
  },
  {
    name: "Jaime Tadeo Pérez Cardona",
    wcaId: "2015CARD01",
    email: "jcardona@worldcubeassociation.org",
    regionId: "bajio",
    title: "Delegado Junior",
    location: "San Luis Potosí — Bajío",
  },
  {
    name: "Leonardo Sánchez Del Toro",
    wcaId: "2016TORO03",
    email: "leotorokr@gmail.com",
    regionId: "occidente",
    title: "Delegado en Entrenamiento",
    location: "Nayarit — Occidente",
  },
  {
    name: "Rocío Rodríguez Rivera",
    wcaId: "2016RIVE14",
    email: "rrivera@worldcubeassociation.org",
    regionId: "centro",
    title: "Delegado Junior",
    location: "Ciudad de México — Centro",
  },
  {
    name: "Saúl Emmanuel Ramírez González",
    wcaId: "2018GONZ21",
    email: "sgonzalez@worldcubeassociation.org",
    regionId: "occidente",
    title: "Delegado Junior",
    location: "Jalisco — Occidente",
  },
];
