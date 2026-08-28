/** AMS competition org board template (mirrors the Trello AMS template). */

export const PHASE_LABELS = [
  {
    name: "Antes del anuncio",
    color: "#22c55e",
    key: "pre_announce" as const,
  },
  {
    name: "Después del anuncio",
    color: "#ef4444",
    key: "post_announce" as const,
  },
  {
    name: "Después de celebrar",
    color: "#3b82f6",
    key: "post_celebrate" as const,
  },
  {
    name: "Recursos",
    color: "#ec4899",
    key: "resources" as const,
  },
] as const;

export type PhaseLabelKey = (typeof PHASE_LABELS)[number]["key"];

export const TEMPLATE_LISTS = [
  "Por Hacer",
  "Haciendo",
  "Hecho",
  "Aprobado",
  "Recursos",
] as const;

type TemplateCard = {
  title: string;
  list: (typeof TEMPLATE_LISTS)[number];
  phase: PhaseLabelKey;
  description?: string;
  checklist?: { title: string; items: string[] };
  attachments?: { name: string; url: string }[];
  coverUrl?: string;
};

export const TEMPLATE_BOARD_NAME =
  "Plantilla AMS — Organización de competencia";

export const TEMPLATE_CARDS: TemplateCard[] = [
  {
    title: "Responsabilidades del Organizador",
    list: "Por Hacer",
    phase: "post_announce",
    description:
      "Revisar y aceptar las responsabilidades del organizador según el reglamento AMS/WCA.",
  },
  {
    title: "Detalles de competencia",
    list: "Por Hacer",
    phase: "pre_announce",
    description:
      "Definir nombre, fechas, ciudad, sede, capacidad y datos generales de la competencia.",
  },
  {
    title: "Permiso de sede",
    list: "Por Hacer",
    phase: "pre_announce",
    description:
      "Obtener permiso escrito o confirmación formal de uso de la sede.",
    checklist: {
      title: "Requisitos mínimos para una sede",
      items: [
        "Lugar cerrado",
        "Iluminación suficiente y blanca",
        "Accesible mediante transporte público",
        "Suministro de electricidad",
        "Sanitarios con insumos",
        "Gratuita o donación en especie",
        "Sistema de audio",
        "WiFi o acceso a Internet",
      ],
    },
  },
  {
    title: "Horario",
    list: "Por Hacer",
    phase: "pre_announce",
    description: "Preparar el horario tentativo de la competencia.",
    attachments: [
      {
        name: "Plantilla de horario",
        url: "https://www.worldcubeassociation.org/",
      },
    ],
  },
  {
    title: "Mapeo de sede",
    list: "Por Hacer",
    phase: "pre_announce",
    description:
      "Elaborar un mapa/layout de la sede (estaciones, registro, público, food, etc.).",
  },
  {
    title: "Categorías",
    list: "Por Hacer",
    phase: "pre_announce",
    description: "Definir eventos WCA y rondas a ofrecer.",
    attachments: [
      {
        name: "Lista de eventos WCA",
        url: "https://www.worldcubeassociation.org/regulations/#9b",
      },
    ],
  },
  {
    title: "Planeación de Staff",
    list: "Por Hacer",
    phase: "pre_announce",
    description:
      "Planear roles de staff (jueces, scramblers, runners) y reclutamiento.",
  },
  {
    title: "Excel de Costos",
    list: "Por Hacer",
    phase: "pre_announce",
    description:
      "Preparar presupuesto (sede, premios, materiales, imprevistos).",
  },
  {
    title: "Sitio web (WCA)",
    list: "Por Hacer",
    phase: "pre_announce",
    description:
      "Crear/actualizar la página de la competencia en el sitio de la WCA.",
  },
  {
    title: "Publicación FB Torneo de Rubik",
    list: "Por Hacer",
    phase: "pre_announce",
    description:
      "Preparar la publicación para el grupo/página de Torneo de Rubik.",
  },
  {
    title: "Diseños",
    list: "Por Hacer",
    phase: "pre_announce",
    description:
      "Diseñar materiales gráficos (banner, stories, diplomas, señalética).",
  },
  {
    title: "Realizar inscripción",
    list: "Por Hacer",
    phase: "post_announce",
  },
  {
    title: "Patrocinios y convenios",
    list: "Por Hacer",
    phase: "post_announce",
  },
  {
    title: "Organización/Capacitación de staff",
    list: "Por Hacer",
    phase: "post_announce",
  },
  {
    title: "Organiza grupos, imprime papeletas",
    list: "Por Hacer",
    phase: "post_announce",
  },
  {
    title: "Preparación registro y Correo Informativo",
    list: "Por Hacer",
    phase: "post_announce",
  },
  {
    title: "Entregar del primer avance de Costos",
    list: "Por Hacer",
    phase: "post_announce",
  },
  {
    title: "Confirmación de equipo de competencia",
    list: "Por Hacer",
    phase: "post_announce",
  },
  {
    title: "Correo Final y Encuesta de Calidad",
    list: "Por Hacer",
    phase: "post_celebrate",
  },
  {
    title: "Entregar informe de costos final",
    list: "Por Hacer",
    phase: "post_celebrate",
  },
  {
    title: "Captura de Resultados",
    list: "Por Hacer",
    phase: "post_celebrate",
  },
  {
    title: "Tutorial Trello AMS",
    list: "Recursos",
    phase: "resources",
    description: "Guía de uso del tablero AMS para organizadores y delegados.",
    attachments: [
      {
        name: "Tutorial tablero AMS",
        url: "https://amscubing.org/",
      },
      {
        name: "Reglamento WCA",
        url: "https://www.worldcubeassociation.org/regulations/",
      },
    ],
  },
  {
    title: "Recursos para Organizadores",
    list: "Recursos",
    phase: "resources",
    description:
      "Enlaces y documentos útiles para la organización de competencias AMS.",
    attachments: [
      {
        name: "Sitio AMS",
        url: "https://amscubing.org/",
      },
      {
        name: "Calendario AMS",
        url: "https://calendario.amscubing.org/",
      },
    ],
  },
];
