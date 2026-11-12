/** AMS championship org board template (based on the Mexican Championship 2025 Trello). */

import {
  EQUIPMENT_CARD,
  ORGANIZER_RESOURCES_CARD,
  PHASE_LABELS,
  SOCIAL_PUBLISH_CARD,
  STAFF_COURSE_URL,
  TEMPLATE_LISTS,
  WCA_WEBSITE_CARD,
  type TemplateListTitle,
} from "./ams-board-template";
import type {
  BoardTemplateCard,
  BoardTemplateDefinition,
} from "./board-templates";

/** Area labels must not reuse phase colors: readiness and card dimming read phases by color. */
const AREA_LABELS = [
  { name: "Logística", color: "#9f8fef", key: "logistics" as const },
  { name: "Comunicación", color: "#94c748", key: "communication" as const },
  { name: "Staff", color: "#fea362", key: "staff" as const },
  { name: "Finanzas", color: "#216e4e", key: "finance" as const },
  {
    name: "Registro y atención",
    color: "#0055cc",
    key: "registration" as const,
  },
  { name: "Captura", color: "#579dff", key: "scoring" as const },
  {
    name: "Bienestar de staff",
    color: "#4bce97",
    key: "staff_wellbeing" as const,
  },
  { name: "Streaming", color: "#974f0c", key: "streaming" as const },
] as const;

export const CHAMPIONSHIP_LABELS = [...PHASE_LABELS, ...AREA_LABELS] as const;

type ChampionshipLabelKey = (typeof CHAMPIONSHIP_LABELS)[number]["key"];

type ChampionshipCard = BoardTemplateCard<
  ChampionshipLabelKey,
  TemplateListTitle
>;

export const CHAMPIONSHIP_TEMPLATE_BOARD_NAME =
  "Plantilla AMS — Organización de campeonato";

/** Championship counterparts of `STAFF_PLANNING_CARD_TITLE` / `STAFF_TRAINING_CARD_TITLE`. */
export const CHAMPIONSHIP_STAFF_PLANNING_CARD_TITLE =
  "Construir un equipo de staff";
export const CHAMPIONSHIP_STAFF_TRAINING_CARD_TITLE =
  "Preparación y capacitación de staff";

export const CHAMPIONSHIP_TEMPLATE_CARDS: ChampionshipCard[] = [
  {
    title: "Establecer las bases técnicas del campeonato",
    list: "Por Hacer",
    labels: ["pre_announce", "scoring"],
    description:
      "**Objetivo:** Definir el formato técnico del campeonato antes del anuncio.\n\n**Pasos:**\n\n1. Determina las categorías, rondas, cortes, límites y tiempos de clasificación.\n2. Define el número de zonas de competencia y de estaciones por zona (p. ej. zonas en el área principal y una en el área silenciosa).\n3. Elabora el horario de todos los días del campeonato. Procura que la hora de inicio sea la misma todos los días para que el staff tenga la misma logística de llegada.\n4. Considera en el horario la inauguración, el registro, la comida, las finales y la premiación.\n5. Comparte aquí la versión final de categorías y horario para su aprobación.\n\n**Nota:** Revisa con los delegados el tabulador de delegados por número de competidores y estaciones.",
    attachments: [
      {
        name: "Cálculo de horarios",
        url: "https://docs.google.com/spreadsheets/d/192O8wqPQooYoXJBC9iF2-Q0EJ7k40Y_0m6iawqL7UY4/edit?usp=sharing",
      },
      {
        name: "Categorías",
        url: "https://docs.google.com/spreadsheets/d/1cUFXbyrLA1NhRZTpia9g-U6KC-BKv44b/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true",
      },
    ],
  },
  {
    title: "Definir y asegurar la sede ideal para el campeonato",
    list: "Por Hacer",
    labels: ["pre_announce", "logistics"],
    description:
      "**Objetivo:** Encontrar una sede que cumpla los requisitos de la WCA y la capacidad del campeonato.\n\n**Pasos:**\n\n1. Busca un lugar adecuado para el número de competidores, zonas y espectadores esperados.\n2. Ten contacto oficial con la sede y deja constancia escrita del acuerdo.\n3. Comenta en esta tarjeta el nombre de la sede, dirección, link de Google Maps, encargado y mobiliario con el que cuenta.\n4. Adjunta el oficio firmado de la sede.",
    checklist: {
      title: "Requisitos de la sede",
      items: [
        "Lugar cerrado",
        "Iluminación suficiente y blanca",
        "Accesible mediante transporte público",
        "Suministro de electricidad",
        "Sanitarios con insumos",
        "Sistema de audio",
        "WiFi o acceso a Internet",
        "Tener oficio firmado de la sede",
      ],
    },
    attachments: [
      {
        name: "Plantilla de Oficio de Sede",
        url: "https://docs.google.com/document/d/1iHgjFPvigrf5QaULEmRKYaDvSPaxOFJg/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true",
      },
    ],
  },
  {
    title: "Elaborar un plano funcional de la sede",
    list: "Por Hacer",
    labels: ["pre_announce", "logistics"],
    description:
      "**Objetivo:** Tener un mapeo de la sede con la disposición de todas las áreas.\n\nConsidera:\n\n- Zonas de competencia (principal y silenciosa)\n- Zona de entrega de cubos\n- Zona de mezcla (aislada visualmente)\n- Zona de espera de competidores\n- Zona de espectadores\n- Zona de registro\n- Zona de captura\n- Zona de staff\n- Zona de streaming\n- Zona de patrocinadores y convivencia\n\nSube el mapeo final en JPG o PNG (además del archivo editable) para que todos puedan consultarlo.",
  },
  {
    title: "Estimar y planear necesidades financieras clave",
    list: "Por Hacer",
    labels: ["pre_announce", "finance"],
    description:
      "**Objetivo:** Definir los posibles gastos y prever las fuentes de ingreso (patrocinios, inscripción, etc.).\n\nArma escenarios con distintos números de inscritos y responde:\n\n- ¿Cuál es el número mínimo de competidores para poder llevar a cabo el campeonato?\n- Con ese mínimo, ¿qué costos se cubren?\n- ¿Qué pasa si no se alcanza el mínimo?\n\nSube aquí la hoja de costos y las conclusiones para su aprobación. **No se puede realizar ningún gasto sin la aprobación de un delegado.**",
  },
  {
    title: "Definir las categorías con costo extra",
    list: "Por Hacer",
    labels: ["pre_announce", "finance"],
    description:
      "**Objetivo:** Decidir qué categorías tendrán un costo de inscripción adicional.\n\nSi es necesario, levanta una encuesta con la comunidad y comparte aquí los resultados y la decisión final.",
  },
  {
    title: "Buscar alianzas que aporten recursos o visibilidad",
    list: "Por Hacer",
    labels: ["pre_announce", "finance", "communication"],
    description:
      "**Objetivo:** Conseguir patrocinadores o aliados que reduzcan costos o den visibilidad al campeonato.\n\nContacta marcas o negocios locales interesados en patrocinar o apoyar. Comenta de cada patrocinador: nombre, logo, tipo de patrocinio (efectivo o en especie) y condiciones.",
    checklist: {
      title: "Checklist",
      items: ["Armar propuesta de patrocinio", "Contactar marcas"],
    },
  },
  {
    title: "Definir bases de patrocinadores",
    list: "Por Hacer",
    labels: ["pre_announce", "finance"],
    description:
      "**Objetivo:** Acordar con la sede qué tipo de patrocinadores se aceptan.\n\nDocumenta aquí las restricciones (p. ej. que se alineen a una imagen inclusiva y familiar) y los espacios disponibles para patrocinadores en la sede.",
  },
  {
    title: "Elaborar un plan de capacitación de staff",
    list: "Por Hacer",
    labels: ["pre_announce", "staff"],
    description:
      "**Objetivo:** Tener listo el plan para capacitar al staff del campeonato.\n\nLa capacitación base es el curso de Staff de la AMS. Agrega las fechas de cada actividad en el checklist.",
    checklist: {
      title: "Actividades y fechas",
      items: [
        "Elaborar borrador de la capacitación de staff",
        "Hacer adecuaciones en el borrador",
        "Preparar recursos didácticos para la capacitación",
        "Preparar sitio web",
        "Hacer adecuaciones finales",
      ],
    },
    attachments: [
      {
        name: "Curso de Staff AMS",
        url: STAFF_COURSE_URL,
      },
    ],
  },
  {
    title: "Diseñar logo del evento",
    list: "Por Hacer",
    labels: ["pre_announce", "communication"],
    description:
      "Crear un logo atractivo que represente el evento a nivel nacional.",
  },
  {
    title: "Presentación del logo",
    list: "Por Hacer",
    labels: ["pre_announce", "communication"],
    description: "Presentar el logo al público de manera atractiva.",
  },
  {
    title: "Diseño de banners página de WCA",
    list: "Por Hacer",
    labels: ["pre_announce", "communication"],
    description:
      "Diseñar los banners e imágenes para las pestañas del sitio del campeonato en la WCA.",
  },
  {
    title: "Póster o video anunciando el campeonato",
    list: "Por Hacer",
    labels: ["pre_announce", "communication"],
    description:
      "Hacer publicaciones en redes sociales, preparando contenido visual e informativo para el anuncio.",
  },
  {
    ...WCA_WEBSITE_CARD,
    labels: ["pre_announce", "communication", "scoring"],
    description: WCA_WEBSITE_CARD.description?.replace(
      "la tarjeta de Horario y Categorías",
      "la tarjeta de bases técnicas del campeonato",
    ),
  },
  {
    title: "Aviso de filmación",
    list: "Por Hacer",
    labels: ["pre_announce", "communication"],
    description:
      "El sitio web del campeonato debe presentar la siguiente notificación:\n\n_**AVISO DE FILMACIÓN Y FOTOGRAFÍA**_\n\nEn este evento se tomarán fotografías y videos que podrán ser usados por la AMS con fines de promoción, documentación y difusión de nuestras actividades.\n\nAl asistir, usted autoriza el uso de su imagen en los términos de nuestro Aviso de Privacidad.\n\n📄 Consúltelo aquí 👉 [https://www.amscubing.org/privacidad/](https://www.amscubing.org/privacidad/)",
  },
  {
    ...SOCIAL_PUBLISH_CARD,
    labels: ["pre_announce", "communication"],
  },
  {
    title: CHAMPIONSHIP_STAFF_PLANNING_CARD_TITLE,
    list: "Por Hacer",
    labels: ["post_announce", "staff", "staff_wellbeing"],
    description: `**Objetivo:** Identificar y contactar organizadores y staff clave con experiencia o compromiso.\n\nPublica en las redes del evento un formulario para los competidores interesados en ser staff y adjúntalo aquí.\n\nRegistra en la sección **Staff** de esta tarjeta a las personas confirmadas (nombre, WCA ID o correo y sus actividades) y compárteles el curso de [**Capacitación de Staff**](${STAFF_COURSE_URL}).`,
  },
  {
    title: CHAMPIONSHIP_STAFF_TRAINING_CARD_TITLE,
    list: "Por Hacer",
    labels: ["post_announce", "staff", "staff_wellbeing"],
    description: `**Objetivo:** Capacitar al staff nuevo y preparar los beneficios de staff.\n\nTodos los voluntarios deben estar capacitados y certificados por la AMS. En la sección **Staff** de esta tarjeta verás quién ya completó el curso de [**Capacitación de Staff**](${STAFF_COURSE_URL}); es la misma lista de **${CHAMPIONSHIP_STAFF_PLANNING_CARD_TITLE}**. Comparte aquí los beneficios acordados (comida, hidratación, registro gratuito, regalo, etc.).`,
    attachments: [
      {
        name: "Instrucciones para jueces",
        url: "https://drive.google.com/file/d/1tfG-t7P9VvF90ZdXMX5nJkQkxAcVm_2t/view?usp=sharing",
      },
    ],
  },
  {
    title: "Abrir el registro y asegurar el control de pagos",
    list: "Por Hacer",
    labels: ["post_announce", "finance", "registration"],
    description:
      "**Objetivo:** Gestionar las inscripciones y confirmar los pagos.\n\nAntes de aceptar a un competidor, verifica su pago y su WCA ID. Acepta registros únicamente dentro de las fechas publicadas en la WCA.",
  },
  {
    title: "Establecer comunicación clara con posibles competidores",
    list: "Por Hacer",
    labels: ["post_announce", "registration"],
    description:
      "Responder dudas, correos y mensajes de los competidores y sus acompañantes.",
  },
  {
    title: "Mantener interés y claridad con los competidores",
    list: "Por Hacer",
    labels: ["post_announce", "registration", "communication"],
    description:
      "Continuar la promoción y enviar los correos informativos importantes (horario de registro, requisitos de acceso, identificación para nuevos competidores, cambios importantes). Todo correo debe ir en **copia oculta (CCO)**.",
    attachments: [
      {
        name: "Plantilla de Correo Informativo",
        url: "https://docs.google.com/document/d/1yQMBQY1mR4Zw3aqO8GdaB7bOkcG1wOSC/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true",
      },
    ],
  },
  {
    title: "Diseño y papelería",
    list: "Por Hacer",
    labels: ["post_announce", "communication"],
    description:
      "**Diseños necesarios:**\n\n- Gafetes (deben incluir el ID del competidor)\n- Diplomas de ganador\n- Reconocimientos de participación\n- Otros (señalética, posters, etc.)",
    attachments: [
      {
        name: "Generador de Certificados y Gafetes",
        url: "https://certificados.cubingmexico.net/sign-in",
      },
    ],
  },
  {
    title: "Asegurar el mobiliario adicional necesario",
    list: "Por Hacer",
    labels: ["post_announce", "logistics", "finance"],
    checklist: {
      title: "Checklist",
      items: [
        "Estimar el número de sillas y mesas extra necesarias para llevar a cabo la competencia",
        "Cotizar precio y disponibilidad de mobiliario",
      ],
    },
  },
  {
    title: "Planear y adquirir materiales clave para la competencia",
    list: "Por Hacer",
    labels: ["post_announce", "finance", "logistics"],
    description:
      "Comprar papelería, etiquetas, gafetes, señalización, etc. Todos los gastos deben comprobarse con ticket, factura o nota.",
  },
  {
    ...EQUIPMENT_CARD,
    labels: ["post_announce", "logistics"],
  },
  {
    title: "Preparar equipo necesario y planear el streaming",
    list: "Por Hacer",
    labels: ["post_announce", "logistics", "streaming"],
    description:
      "Verificar qué equipo será necesario (cámaras, computadoras, internet, audio) y planear la logística para la transmisión del campeonato.",
  },
  {
    title: "Formar grupos de competidores para cada ronda",
    list: "Por Hacer",
    labels: ["post_announce", "scoring", "staff"],
    description:
      "Establecer los grupos y zonas de la competencia y asignar las tareas de staff. Se recomienda usar Groupifier; consulta con los delegados antes de imprimir las papeletas.",
    attachments: [
      {
        name: "Introducción a Groupifier",
        url: "https://drive.google.com/file/d/1g-c-FKlteNpMq2WqefNmItSEgJ1iUwr3/view?usp=sharing",
      },
    ],
  },
  {
    title: "Asegurar un manejo claro de los fondos del evento",
    list: "Por Hacer",
    labels: ["post_announce", "finance"],
    description:
      "Llevar el registro de ingresos y egresos con sus comprobantes en el drive de costos del campeonato.",
  },
  {
    title: "Acondicionar la sede para la competencia",
    list: "Por Hacer",
    labels: ["during_competition", "logistics", "staff"],
    description:
      "Montar estaciones, señalización, mesas de espera y área de jueces.",
  },
  {
    title: "Hacer el registro en la competencia",
    list: "Por Hacer",
    labels: ["during_competition", "registration"],
    description:
      "Hacer registro en la competencia, entregar gafetes y kits de competidor.",
  },
  {
    title: "Supervisar el desarrollo continuo del evento",
    list: "Por Hacer",
    labels: ["during_competition", "logistics", "staff"],
    description:
      "Asegurar que el evento se mantenga en tiempo, ajustando si es necesario.",
  },
  {
    title: "Mantener la moral y la funcionalidad del staff",
    list: "Por Hacer",
    labels: ["during_competition", "staff", "staff_wellbeing"],
    description:
      "Supervisar que cada miembro esté en su rol y tomar acciones si falta alguien.",
  },
  {
    title: "Subir resultados en la WCA Live",
    list: "Por Hacer",
    labels: ["during_competition", "scoring", "staff"],
    description:
      "Asegurarse de que los resultados se suban en vivo en la WCA Live, con doble revisión de cada grupo capturado.",
  },
  {
    title: "Documentar y comunicar el evento en redes",
    list: "Por Hacer",
    labels: ["during_competition", "streaming", "communication"],
    description:
      "Compartir contenido del evento en vivo (fotos, historias, menciones).",
  },
  {
    title: "Desmontar y dejar limpia la sede",
    list: "Por Hacer",
    labels: ["during_competition", "staff", "logistics"],
    description: "Desarmar estaciones y dejar la sede como estaba.",
  },
  {
    title: "Correo informativo y agradecimiento a competidores y staff",
    list: "Por Hacer",
    labels: ["post_celebrate", "registration", "communication", "finance"],
    description:
      "Enviar un correo o publicación para agradecer la participación. Incluir el resumen de gastos.",
    attachments: [
      {
        name: "Plantilla de Correo de Agradecimiento Post-Competencia",
        url: "https://docs.google.com/document/d/1hGkNz_hwaXkArgqhUFEiR0AZ10Qt1Yxk/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true",
      },
    ],
  },
  {
    title: "Generar un resumen financiero del evento",
    list: "Por Hacer",
    labels: ["post_celebrate", "finance"],
    description: "Hacer un informe final con ingresos, egresos y saldos.",
  },
  ORGANIZER_RESOURCES_CARD,
];

export const CHAMPIONSHIP_BOARD_TEMPLATE: BoardTemplateDefinition = {
  key: "championship",
  name: CHAMPIONSHIP_TEMPLATE_BOARD_NAME,
  labels: CHAMPIONSHIP_LABELS,
  lists: TEMPLATE_LISTS,
  cards: CHAMPIONSHIP_TEMPLATE_CARDS,
  retiredCardTitles: [],
};
