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
  {
    name: "Pre-organización",
    color: "#eab308",
    key: "pre_organization" as const,
  },
  {
    name: "Durante la competencia",
    color: "#5e4db2",
    key: "during_competition" as const,
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
  phases: PhaseLabelKey[];
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
    phases: ["pre_organization"],
    description: "**Objetivo:** Que los organizadores conozcan a profundidad sus obligaciones y responsabilidades en las competencias.\n\nIngresa al formulario adjunto en esta tarjeta y lee detenidamente todos los apartados de las [**Responsabilidades del Organizador**](https://forms.gle/2uGNa6VS92zWZQ8L7). Deberás aceptar cada una de ellas y enviar la encuesta utilizando el mismo correo con el que ingresaste a este Trello.\n\nUna vez que **todos los organizadores envíen sus formularios firmados**, puedes mover esta tarjeta a **“Hecho”**.\n\n**Nota:** Si tienes alguna duda o no estás de acuerdo con alguna de las responsabilidades, comunícate directamente con tu delegado.\n\n**Nota:** Si eres **menor de edad**, deberás incluir en el formulario la[](https://docs.google.com/document/d/1yE3-VPiLGPYOZ9Nlee7ywYpMH4wat1dZu9cosWZUG8U/edit?usp=sharing) [**carta responsiva**](https://drive.google.com/file/d/17HTATkxobh5BxdxIV-V0w9Cux_L3TjxG/view?usp=drive_link)\\*\\* firmada por tu tutor legal\\*\\*.",
  },
  {
    title: "Detalles de competencia",
    list: "Por Hacer",
    phases: ["pre_announce"],
    description: "**Objetivo:** Establecer los detalles básicos de la competencia\n\nComenta los siguientes detalles de la competencia:\n\n- **Nombre** (debe incluir algún identificador de ciudad, estado o sede\\_ )\n- **Razón para el nombre**\n- **Número de competidores**\n- **Número de estaciones** (*recuerda que para 1 delegado pueden ser máximo 10 estaciones)*\n- **Fechas**\n- **Numero de eventos**\n- **Evento principal** (e\\_n caso de no ser 3x3, agrega el motivo\\_)\n\nAntes de responder esta tarjeta revisa la [Tabla de experiencia del Organizador](https://docs.google.com/spreadsheets/d/1JrbT94RB9VpDiCdHmGtC-mJeE4Mux6bh/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true) para revisar si cumples con la experiencia necesaria para el desarrollo del evento.\n\nSi tu competencia tiene más de 120 competidores o más de 12 estaciones deberás solicitar el apoyo de más delegados dependiendo del número, revisa el [Tabulador de Delegados por número de competidores y estaciones](https://docs.google.com/spreadsheets/d/1JCwaqBC1EgazWiHMzyHC5dKVy9bkH7m7/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true)",
  },
  {
    title: "Permiso de sede",
    list: "Por Hacer",
    phases: ["pre_announce"],
    description: "**Objetivo:** Determinar la fecha del torneo y sede\n\n**Paso 1:** Confirma el check list \"Requisitos mínimos para una sede\".  \nSi la sede no cuenta con alguno de los requisitos mínimos, será necesario plantear un plan para resolver la falta del mismo.\n\n**Paso 2:** Comenta esta tarjeta con la siguiente información:\n\n- Nombre de la sede\n- Dirección\n- Link de Google Maps\n- Nombre del encargado o persona que autoriza el lugar\n- Mobiliario y extras (comenta cuántas mesas, sillas, equipo de audio, premios o cualquier otro apoyo con el que cuente la sede)\n\n**Paso 3:** Adjunta el permiso de la sede\n\n**Nota:** El costo máximo de una sede, en caso de no ser gratuita, es de $1,200.00 pesos por día. En caso de ser más, consúltalo con tu delegado principal.\n\n**Nota:** Puedes revisar los Recursos para el Organizador para encontrar una plantilla de permiso de sede en caso de necesitarla.",
    checklist: {
      title: "Checklist permiso de sede",
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
    phases: ["pre_announce"],
    description: "**Objetivo:** Organizar un horario\n\nAdjunta una propuesta de horario. Recuerda NO asignar más de 9 horas por día e incluye en los horarios las siguientes actividades:\n\n- Registro de asistencia\n- Tutorial para nuevos competidores\n- Instalación de equipo\n- Entrega de cubos para Multi-Blind (si aplica)\n- Hora de comida\n- Premiación y entrega de diplomas\n\n**Paso 1:** Descarga la plantilla de horarios.  \n**Paso 2:** Coloca el número de estaciones (consulta con tu delegado la cantidad de estaciones disponibles).  \n**Paso 3:** Coloca el estimado de competidores (3x3 y 2x2 deberán tener el 100% de registros).  \n**Paso 4:** Una vez estimado, pasa a la segunda hoja y comienza a distribuir las rondas de la competencia; puedes basarte en otra competencia similar para crear tu horario.  \n**Paso 5:** Cuando estés satisfecho con tu documento, súbelo a esta tarjeta y pásala a hecho.\n\n**Nota:** Es posible aprovechar el tiempo y realizar actividades simultáneas, como la instalación y el registro. En caso de ser posible, la instalación se puede realizar un día antes de la competencia.\n\n**Nota:** Es importante que, aunque el desmontaje y guardado de equipo no se coloque en el horario, se considere dentro de las actividades del último día de competencia.",
    attachments: [
      {
        name: "Cálculo de horarios",
        url: "https://docs.google.com/spreadsheets/d/192O8wqPQooYoXJBC9iF2-Q0EJ7k40Y_0m6iawqL7UY4/edit?usp=sharing",
      },
    ],
  },
  {
    title: "Mapeo de sede",
    list: "Por Hacer",
    phases: ["pre_announce"],
    description: "**Objetivo:** Tener un mapeo de la sede y organizar la disposición de áreas.\n\n**Paso 1:** Asiste al lugar, toma fotos o video, y mide el espacio exhaustivamente.\n\n**Paso 2:** Confirma el tamaño de mesas y tablones, y traza en un mapa con medidas cómo te imaginas que quedaría todo organizado. Recuerda que se requieren:\n\n- Zona de competencia (debe tener como mínimo 1.5 metros de distancia respecto a la zona de espectadores)\n- Zona de competencias extra (si aplica)\n- Zona de entrega de cubos\n- Zona de mezcla (debe estar aislada visualmente)\n- Zona de espectadores\n- Zona de registro de asistencia\n- Zona de captura\n- Zona de staff (opcional)\n- Zona de convivencia (opcional)\n- Zona para resguardo de equipo (opcional)\n\n**Nota:** Es muy importante que te asegures de que la iluminación y la temperatura sean adecuadas para la competencia.",
  },
  {
    title: "Categorías",
    list: "Por Hacer",
    phases: ["pre_announce"],
    description: "**Objetivo:** Elegir las categorías, definir cortes, límites y cantidad de competidores esperados.\n\n**Paso 1:** Revisa el archivo [“Categorías y Formatos”](https://docs.google.com/document/d/1HtJbibZnOWJdK3x6Lr25WutW38AtlIYs) antes de continuar con esta tarjeta.\n\n**Paso 2:** Adjunta el documento en Excel con la siguiente información:\n\n- Categorías seleccionadas\n- Corte (si aplica)\n- Límite (si aplica)\n- Cantidad de rondas\n- Cantidad de competidores esperados\n\n**Paso 3:** Si deseas añadir alguna categoría especial como FTO, Team-Blind u otros, coméntalo en esta tarjeta con el siguiente formato:\n\n- Nombre del Evento:\n- Formato:\n- Tiempo asignado:\n\n**Nota:** Si tienes dudas, consulta a tu delegado.",
    attachments: [
      {
        name: "Categorías",
        url: "https://docs.google.com/spreadsheets/d/1cUFXbyrLA1NhRZTpia9g-U6KC-BKv44b/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true",
      },
    ],
  },
  {
    title: "Planeación de Staff",
    list: "Por Hacer",
    phases: ["pre_announce"],
    description: "**Objetivo:** Definir y corroborar el compromiso del staff.\n\nSi eres una comunidad emergente o pequeña, es recomendable contar con una base de staff confiable para el desarrollo de las tareas. El mínimo de staff recomendado se determina por la fórmula: **Estaciones + 4**; si se tiene más de una zona, aumenta **+4 por cada zona extra**.\n\nSi estás organizando una competencia silenciosa o con menos de 35 competidores, puedes optar por no tener una base de staff, pero deberás garantizar mezcladores para los eventos **5x5, SQ1, Megaminx y Clock**.\n\n**Actividades del staff:**\n\n- Jueces\n- Mezcladores\n- Corredores\n- Registro\n- Capturistas\n\nPara agregar los eventos **5x5, SQ-1, Megaminx, Clock y Skewb**, debes demostrar mediante un video que los staff pueden mezclar los cubos con eficiencia.\n\n- Competencias con menos de 80 competidores: mínimo **2 mezcladores**.\n- Competencias con más de 80 competidores: recomendable **4 mezcladores**.\n\n**Paso 1:** Comenta: ¿Cuántas personas de staff crees que necesitas?  \n**Paso 2:** Adjunta o comenta links o videos de mezcladores (si aplica).  \n**Paso 3:** Comenta cuál es tu plan de capacitación para el staff, cómo piensas llevar el control de sus actividades y qué beneficios planeas otorgarles (comida, hidratación, algún lunch, registro gratuito, apoyo de transporte, regalo especial, sorteo, etc).\n\n**Nota:** Si quieres saber más sobre el staff, puedes tomar el curso de **Capacitación de Staff** certificado por la **Asociación Mexicana de Speedcubing (AMS)**.",
  },
  {
    title: "Excel de Costos",
    list: "Por Hacer",
    phases: ["pre_announce"],
    description: "**Objetivo:** Analizar los costos de la competencia para definir el costo de inscripción. **NO SE PUEDE REALIZAR NINGÚN GASTO SIN LA APROBACIÓN DE UN DELEGADO.**\n\n**Paso 1:** Solicita al delegado la creación de tu drive de costos y tu carpeta de comprobantes. Todos los cambios deberán hacerse en este documento; no se puede usar otra plantilla.\n\n**Paso 2:** Dentro del documento encontrarás los posibles costos o ingresos. Llena la primera versión, considerando insumos gratuitos, patrocinadores y gastos imprescindibles.\n\n**Paso 3:** Puedes añadir cualquier costo no enlistado, previo acuerdo con tu delegado.\n\n**Paso 4:** No añadas ni elimines secciones del documento. Para gastos especiales, consulta a tu delegado para agregarlos.\n\n**Paso 5:** Cuando el documento esté listo, mueve esta tarjeta a “Hecho”.\n\n**Equipo de competencia:** Gracias a las aportaciones voluntarias y a la Asociación Mexicana de Speedcubing, podrás contar sin costo con el equipo necesario, siempre que sea parte del equipo de cada delegado. Incluye estaciones completas con displays y timers, extensiones para la zona de competencia, impresoras para viajes cortos, cronómetros de mano y material de oficina como bolígrafos, marcadores, tijeras, cutters y baterías. **Para más información revisa la tarjeta de Confirmar equipo de competencia.**\n\n**Viáticos a considerar:**\n\n- **Llegada y salida:** Los delegados deberían llegar un día antes y salir un día después de la competencia.\n- **Alimentos:** Incluye los días de llegada, competencia y salida.\n- **Hospedaje:** Si es posible, quedarse en casa de alguien; si no, optar por un hotel sencillo cercano.\n- **Transporte:** Considera transporte desde la ciudad del delegado, equipaje documentado, transporte local durante todos los días y Uber o similar según necesidad.\n\n**Cuota WCA:** Donativo obligatorio del 5% del registro, asignado por el delegado según número de competidores.  \n**Cuota AMS:** Donativo obligatorio del 5% para la gestión de la Asociación Mexicana de Speedcubing.\n\n**Nota:** Todos los gastos deben comprobarse mediante ticket, factura o nota. En caso de no contar con alguno, consulta con tu delegado.",
  },
  {
    title: "Sitio web (WCA)",
    list: "Por Hacer",
    phases: ["pre_announce"],
    description: "Objetivo: Tener lista la competencia en el sitio web de la WCA para su anuncio:\n\n**Paso 1.-** Solicita a tu delegado la creación del sitio de la competencia. Entra a tu perfil de la WCA y en la sección **Competitions → My Competitions**, encontrarás la web de la competencia.\n\n**Paso 2.-** Coloca toda la información de la competencia. Puedes usar de referencia la siguiente competencia: *Competencia de ejemplo*, y rellenar todos los datos. Revisa que todo esté correcto.\n\n- El **ID**, **Name** y **Nickname** deben ser idénticos (excepto si son más de 30 caracteres).\n- Revisa que la dirección, mapa y coordenadas estén exactamente correctos.\n- Los campos **Razón de nombre** y **Comentarios finales** deben ser llenados en **inglés**.\n- Todas las secciones de texto deben estar en **Español e Inglés**.\n\n**Paso 3.-** Edita la información de eventos y horarios.  \nEn **Edit → Manage Events → Manage Schedule**, debes agregar las categorías, rondas y horarios según lo aceptado en la tarjeta de Horario y Categorías.\n\n**Paso 4.-** Añade pestañas con información adicional.  \nEn **Manage Tab** puedes agregar pestañas con información adicional (Cómo llegar, recomendaciones de hospedaje, patrocinadores). Recuerda que todo debe ir en **inglés y español**.\n\n**Paso 5.-** Revisa a detalle que todo esté correcto y mueve esta tarjeta a **Hecho** cuando esté lista para su revisión.\n\n**Nota:** Si tu competencia tiene alguna condición especial como:\n\n- Registro por depósito\n- Donaciones activadas\n- Políticas de Check-In obligatorias (Regla 2k1)\n- Políticas de acompañantes\n\nDeberás colocarlas en la sección de **Extra Registration Requirements**; de lo contrario, puedes dejar esa sección vacía.",
  },
  {
    title: "Publicación FB Torneo de Rubik",
    list: "Por Hacer",
    phases: ["pre_announce"],
    description: "[https://www.facebook.com/TorneoRubik](https://www.facebook.com/TorneoRubik)  es una página de Facebook creada para publicar las competencias oficiales de la WCA.\n\nSi deseas que publiquemos tu competencia con todos los detalles, por favor completa el siguiente formulario: [https://forms.gle/jsU3YiogaRrxun6W8](https://forms.gle/jsU3YiogaRrxun6W8)\n\nSi no estás interesado en esta tarjeta, comenta “No estoy interesado” y mueve esta tarjeta a la columna “Hecho”.",
  },
  {
    title: "Diseños",
    list: "Por Hacer",
    phases: ["pre_announce", "post_announce"],
    description: "**Objetivo:** Tener todos los diseños listos\n\n**Diseños necesarios:**\n\n- **Logo** (Pre Anuncio)\n- **Gafetes** (Deben incluir el ID del competidor)\n- **Diplomas** de ganador\n- **Reconocimiento** de participación\n- **Otros** (Posters, señalética, etc.)\n\n**Paso 1:** Crea el logo de la competencia y el material para su anuncio (no es necesario marcar esta tarjeta como “hecho” todavía).\n\n**Paso 2:** Al diseñar los gafetes, es estrictamente necesario incluir el **ID del competidor** (número de orden de registro).\n\n- Para facilitar la generación masiva, puedes utilizar las herramientas de creación de gafetes disponibles en la sección de **Recursos del Organizador**.\n\n**Paso 3:** Crea los diseños restantes y compártelos en esta tarjeta, ya sea subiendo los archivos directamente o compartiendo un enlace a una carpeta de Drive.\n\nPaso 4: Una vez tengas todos los diseños aprobados y completos, mueve esta tarjeta a **“Hecho”**\n\n**Nota:** Se permite el uso de los logos de la **WCA** y la **AMS** exclusivamente para fines de esta competencia. **Está estrictamente prohibido su uso con fines de lucro o para cualquier actividad ajena al evento.**",
  },
  {
    title: "Realizar inscripción",
    list: "Por Hacer",
    phases: ["post_announce"],
    description: "**Objetivo:** Asegurar que todos los competidores estén correctamente registrados antes de aceptar su participación.\n\nPara aceptar a alguien en la competencia, además de verificar su pago, se debe realizar lo siguiente:\n\n1. **Verificar el WCA ID del competidor**\n\n**A) Si no tiene un WCA ID vinculado:**\n\n- **Paso 1:** Copia y pega su nombre en el buscador de la WCA. Si no existe ninguna coincidencia, puedes aceptar el registro.\n- **Paso 2:** Si existe alguna coincidencia, solicita al competidor por correo que realice su registro usando la cuenta que ya tiene WCA ID.\n- **Paso 3:** Si el competidor no recuerda su cuenta o desea usar una nueva, solicita que contacte al delegado principal por medio de su correo electrónico para realizar el cambio de WCA ID.\n\n**B) Si el competidor tiene WCA ID vinculado:**\n\n- Puedes aceptarlo sin inconveniente una vez que haya realizado el pago.\n\n**Nota:** Es obligatorio aceptar competidores únicamente dentro de las fechas establecidas en la página de la WCA. Si tienes alguna duda con algún registro, contacta a tu delegado.",
  },
  {
    title: "Patrocinios y convenios",
    list: "Por Hacer",
    phases: ["post_announce"],
    description: "**Objetivo:** Reducir los costos de la competencia para hacerla más accesible.\n\n**TODOS LOS PATROCINIOS Y ACUERDOS DEBEN SER DECLARADOS EN ESTA SECCIÓN**\n\n- Todo patrocinio o acuerdo debe buscar un beneficio mutuo. Lo ideal es que los patrocinadores cubran los costos más importantes de la competencia, ya sea en efectivo o en especie.\n- Si un patrocinador no está dispuesto a aportar un beneficio al evento, no regales el trabajo del equipo, de los voluntarios ni de los miembros de la WCA.\n- No te limites a buscar patrocinadores solo en tiendas de cubos. Explora también opciones locales como restaurantes, hoteles, cafeterías y otros negocios cercanos. Esto puede abrir más oportunidades y fortalecer el apoyo de la comunidad local.\n\n**Pasos:**\n\n1. Comenta la siguiente información de todos y cada uno de los patrocinadores:\n  - Nombre del patrocinador\n  - Logo (para incluir en los tabs del sitio y/o en diseños)\n  - Tipo de patrocinio (efectivo o en especie)\n  - Condiciones del patrocinio\n2. Mantén actualizado el Drive de costos con esta información\n\n**Nota:** Para patrocinadores extranjeros considera una cuota de importación; si tienes dudas sobre esto, consulta a tu delegado.",
  },
  {
    title: "Organización/Capacitación de staff",
    list: "Por Hacer",
    phases: ["post_announce"],
    description: "**Objetivo:**  \nDefinir los requisitos y responsabilidades de los voluntarios para que puedan acceder a los beneficios establecidos durante la competencia.\n\n**Requisitos mínimos de los voluntarios para recibir beneficios:**\n\n- Estar capacitados.\n- Asistir al montaje de la sede.\n- Asistir al desmontaje del equipo.\n- Tener tareas asignadas y cumplirlas.\n- Usar o portar su distintivo durante la competencia.\n\n**Pasos:**\n\n1. Adjunta las certificaciones de los voluntarios.\n2. Asigna sus actividades mediante **Groupifier**.\n3. Notifica de manera clara y oportuna los requisitos y la forma de control para que los voluntarios puedan recibir sus beneficios.\n  - Recuerda que, según el reglamento, todos los competidores deben estar disponibles para apoyar durante la competencia, pero ayudar una o dos veces sin una asignación formal no los convierte en voluntarios.\n\n**Notas importantes:**\n\n- Todos los voluntarios deberán estar capacitados y certificados por la **Asociación Mexicana de Speedcubing**. Solicita a tus voluntarios que tomen el curso y comparte aquí sus certificados.\n- Si se otorga reducción o devolución de la tarifa de inscripción, esta solo puede aplicarse una vez que la competencia haya concluido.\n- Puedes consultar **Recursos de organizador**, donde encontrarás un manual de [Instrucciones para Jueces](https://drive.google.com/file/d/1tfG-t7P9VvF90ZdXMX5nJkQkxAcVm_2t/view?usp=sharing)",
  },
  {
    title: "Organiza grupos, imprime papeletas",
    list: "Por Hacer",
    phases: ["post_announce"],
    description: "**Objetivo:**  \nOrganizar los grupos de competidores y asignar el apoyo de staff y voluntarios durante el evento.\n\n**Pasos:**\n\n1. **Organización de grupos:**\n  - Define los grupos de competidores.\n  - Asigna qué personas ayudarán como staff y cuáles como apoyo externo.\n  - Se recomienda utilizar [Groupifier](http://groupifier.jonatanklosko.com/).\n  - **Configuración Obligatoria (Double Check):** Al configurar la exportación, es obligatorio habilitar la opción:\n    - *“Print out scramble checker sign box for top ranked competitors (WR100 in single or WR50/NR15 in average)”*. Esto permitirá realizar el proceso de verificación doble a los competidores que cumplan con estos rangos de ranking.\n  - Si tienes dudas sobre el uso de esta aplicación, revisa el material de [**Introducción a Groupifier**](https://drive.google.com/file/d/1g-c-FKlteNpMq2WqefNmItSEgJ1iUwr3/view?usp=sharing) o solicita apoyo de tu delegado principal.\n  - Antes de imprimir, consulta con tu delegado para verificar que los grupos estén correctamente creados.\n2. **Impresión y preparación de papeletas:**\n  - Imprime y separa las papeletas por grupos, preferiblemente siguiendo la cronología del evento.\n  - Al finalizar el evento, deberás entregar las papeletas completas, revisadas y ordenadas para su respectivo resguardo, incluyendo aquellas de competidores que no asistieron. Consulta la tarjeta de **\"Captura de Resultados\"** para más información.\n\n**Nota:**  \nAlgunos delegados cuentan con impresora; puedes solicitar su apoyo para imprimir las papeletas si lo necesitas.",
  },
  {
    title: "Preparación registro y Correo Informativo",
    list: "Por Hacer",
    phases: ["post_announce"],
    description: "**Objetivo:** Preparar los archivos necesarios para entregar a cada competidor su gafete y/o kit y confirmar que los datos de los competidores nuevos son correctos. *Es conveniente hacer una fila especial para nuevos competidores.*\n\n**Paso 1.-** Correo Informativo: Mandar un correo **en copia oculta** **CCO** a todos los competidores con los detalles importantes\n\n- Información sobre horario de registro check/in\n- Requisitos para el acceso\n- Pedir a todos los nuevos competidores llevar alguna identificación con fotografía\n- Tareas de staff/apoyo\n- Información sobre patrocinadores\n- Cambios importantes\n\n**Paso 2.-** Subir el archivo de Excel/Drive que se usará para el registro y entrega de kits (en caso de tenerlos). Este debe de cumplir con las siguientes funciones:\n\n- Check de asistencia de los competidores que han llegado.\n- Registro de los kits/gafetes que se han entregado.\n- Confirmar con nuevos competidores fecha de nacimiento, nombre completo y género.\n\n**Nota:** En caso de enviar por error el correo en **CC** en lugar de **CCO** contacta a tu delegado cuanto antes.",
    attachments: [
      {
        name: "Plantilla de Correo Informativo",
        url: "https://docs.google.com/document/d/1yQMBQY1mR4Zw3aqO8GdaB7bOkcG1wOSC/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true",
      },
    ],
  },
  {
    title: "Entregar del primer avance de Costos",
    list: "Por Hacer",
    phases: ["post_announce"],
    description: "**Objetivo:**  \nComparar de manera precisa los costos aproximados con los costos reales de la competencia.\n\n**Pasos:**\n\n1. Solicita a tu delegado que desbloquee la sección de **Primera Entrega de Costos** en el Drive compartido previamente.\n2. Completa todos los campos correspondientes a los **costos reales** (**no modifiques los costos esperados**).\n3. Sube los comprobantes de los costos a la carpeta compartida proporcionada previamente. Recuerda que todos los gastos deberán comprobarse mediante un comprobante válido: **ticket, factura o nota**. Las capturas de transferencias NO son comprobantes válidos.\n4. Adjunta los comprobantes directamente desde la carpeta en el documento de Excel.\n\n**Nota:**\n\n- El archivo de costos completo, incluyendo las inscripciones recaudadas, debe entregarse a más tardar cinco días antes de la competencia.\n- Cualquier costo adicional registrado durante la competencia deberá agregarse al finalizar el evento.\n- TODOS los costos realizados deberán tener comprobante o ticket. En caso de no contar con él, consulta con tu delegado antes de realizar la compra.",
  },
  {
    title: "Confirmación de equipo de competencia",
    list: "Por Hacer",
    phases: ["post_announce"],
    description: "**Objetivo:**  \nAsegurar el buen uso y cuidado del equipo que los delegados llevan a las competencias.\n\n**Pasos:**\n\n1. Solicita al delegado una lista con el equipo disponible que se llevará a la competencia.\n2. Los organizadores deberán revisar esta lista, confirmar con el delegado qué equipo requerirán y acordar los detalles.\n3. Una vez confirmado, se debe descargar e imprimir la ficha de equipo para registrar la entrega y devolución del mismo durante la competencia.\n\n**Nota:**  \nEl cuidado del equipo es responsabilidad de los organizadores. Cualquier daño o pérdida será responsabilidad de quienes lo reciban.",
  },
  {
    title: "Correo Final y Encuesta de Calidad",
    list: "Por Hacer",
    phases: ["post_celebrate"],
    description: "**Objetivo:**  \nEnviar un correo para dar claridad al uso de recursos durante la competencia, agradecer a los patrocinadores y a los competidores asistentes.\n\n**IMPORTANTE:**  \nTodo correo debe incluir a los destinatarios en **copia oculta (CCO)**. Consulta con tu delegado antes de enviarlo.\n\n**Pasos:**\n\n1. Redacta un correo dirigido a todos los competidores (previa autorización y revisión de tu delegado).\n2. Sube el borrador de tu correo aquí para recibir autorización del delegado.\n3. Incluye en el correo un resumen de ingresos y egresos de la competencia.\n4. Adjunta o comparte los reconocimientos de participación digitales (Opcional).\n5. Solicita a tu delegado el link de la encuesta de calidad e inclúyelo en el correo.\n6. Asegúrate de agradecer tanto a los patrocinadores como a los competidores asistentes.\n\n**Nota:**  \nEste correo debe enviarse únicamente después de la revisión y autorización de tu delegado.  \nSi tienes dudas revisa la [**Plantilla de Correo Final**.](https://docs.google.com/document/d/1hGkNz_hwaXkArgqhUFEiR0AZ10Qt1Yxk/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true)",
  },
  {
    title: "Entregar informe de costos final",
    list: "Por Hacer",
    phases: ["post_celebrate"],
    description: "**Objetivo:**  \nRegistrar y actualizar los costos de la competencia de manera completa y transparente dentro de los **tres días posteriores al evento**.\n\n**Pasos:**\n\n1. Solicita a tu delegado que desbloquee la sección final de la plantilla de costos asignada al inicio del evento.\n2. **No modifiques ninguna de las entradas anteriores**, únicamente la sección de costos finales.\n3. Actualiza la sección final de costos con las modificaciones necesarias.\n4. Anexa **todos los comprobantes en la carpeta compartida previamente**.\n5. En caso de existir un remanente, comenta en esta tarjeta el uso que te gustaría darle. Si tienes dudas, consúltalo con tu delegado.\n\n**Nota:**  \n**Todos los gastos deben contar con comprobante o ticket**. En caso de no tenerlo, escribe en la sección de “ticket” el motivo correspondiente.",
  },
  {
    title: "Captura de Resultados",
    list: "Por Hacer",
    phases: ["post_celebrate", "during_competition"],
    description: "**Objetivo:**  \nDefinir el proceso de captura durante la competencia.\n\n**Pasos:**\n\n1. Asigna a las personas encargadas de la captura. Se requieren al menos **2 personas** para esta tarea.\n2. En caso de que el staff sea nuevo o nunca haya capturado, solicita a tu delegado que lo capacite antes de iniciar el evento.\n3. Una vez que un capturador finalice la captura completa de un grupo, **una persona diferente** deberá realizar una segunda revisión.\n4. La persona que realice la segunda revisión deberá juntar las papeletas (importante: no engrapar ni usar cinta adhesiva) y firmar al reverso de la última papeleta, o en la portada en caso de existir.\n5. Verifica que no falte ninguna papeleta y, al finalizar el evento, entrega todas de forma ordenada al delegado para su resguardo.\n\n**Nota:**  \nSi falta alguna papeleta debes informar al delegado inmediatamente.",
  },
  {
    title: "Tutorial Trello AMS",
    list: "Recursos",
    phases: ["resources"],
    description: "**¿Dudas con como usar Trello?**, revisa los siguientes videos. En ellos encontrarás información sobre cómo trabajar con este modelo de organización\n\n[Manual Básico de Trello](https://www.youtube.com/watch?v=gGcLLDRVYcc)\n\nSi ya has utilizado Trello en anteriores ocasiones puedes archivar esta tarjeta dando clic en la Acción de archivar que se encuentra del lado derecho",
  },
  {
    title: "Recursos para Organizadores",
    list: "Recursos",
    phases: ["resources"],
    description: "**¡Hola Organizador!**, Estamos emocionados de tu ambición y decisión por organizar una **competencia reconocida por la WCA**.\n\nEn está tarjeta encontrarás un recopilatorio de **documentos y herramientas** para el Organizador. Si esta es tu primera competencia organizada te recomendamos revisarlos dando clic en “**Ver todos los adjuntos“** y así tener en claro que se necesita para organizar una competencia.\n\nSi ya has organizado competencias, siempre puedes revisar los **nuevos documentos y herramientas** que están a tu disposición.\n\nEsta tarjeta no requiere ser aprobada y puede archivarse en caso de no necesitarse en los botones del lado derecho.",
    attachments: [
      {
        name: "Curso de Staff AMS",
        url: "https://amscubing.org/detalle-cursos/",
      },
      {
        name: "Instrucciones para jueces",
        url: "https://drive.google.com/file/d/1tfG-t7P9VvF90ZdXMX5nJkQkxAcVm_2t/view?usp=sharing",
      },
      {
        name: "Plantilla Cubre Cubos",
        url: "https://drive.google.com/file/d/1AveCqVS2-9pL9gnR5TLaiu7FZ3WIElrE/view?usp=drive_link",
      },
      {
        name: "Plantilla de Oficio de Sede",
        url: "https://docs.google.com/document/d/1iHgjFPvigrf5QaULEmRKYaDvSPaxOFJg/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true",
      },
      {
        name: "Política de Requisitos para Competencias",
        url: "https://docs.google.com/document/d/1DV5rMGg4_E-iIEe2E6lXRR8ZpRxryBMO/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true",
      },
      {
        name: "Generador de Certificados y Gafetes",
        url: "https://certificados.cubingmexico.net/sign-in",
      },
      {
        name: "Logos de Categorías",
        url: "https://github.com/cubing/icons/tree/main/src/svg/event",
      },
      {
        name: "Plantilla de Correo Informativo",
        url: "https://docs.google.com/document/d/1yQMBQY1mR4Zw3aqO8GdaB7bOkcG1wOSC/edit?usp=sharing&ouid=115645000405842078592&rtpof=true&sd=true",
      },
      {
        name: "Plantilla de Correo de Agradecimiento Post-Competencia",
        url: "https://docs.google.com/document/d/1hGkNz_hwaXkArgqhUFEiR0AZ10Qt1Yxk/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true",
      },
      {
        name: "Gastos de una Competencia (Tutorial)",
        url: "https://docs.google.com/document/d/19NBKkdSqdBNgfgV6oRhWcGv4Sh-uKFEW/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true",
      },
      {
        name: "Crea a tu Equipo Organizador (Tutorial)",
        url: "https://docs.google.com/document/d/13xcyknlkjH6SlzmTEN5c3guQWsD5DxI-/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true",
      },
      {
        name: "Crear un Horario (Tutorial)",
        url: "https://docs.google.com/document/d/114MaShlZhXvbDXi6eaneohQZovPmgu9_/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true",
      },
      {
        name: "Encontrar una Sede (Tutorial)",
        url: "https://docs.google.com/document/d/1PbtazWUhdIDmtWVVDl2k0sFf7oZ9QsqS/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true",
      },
      {
        name: "Trabajo del Organizador Durante la Competencia",
        url: "https://docs.google.com/document/d/15kxM-l42_sXh51Dr4iUd9dKGNeOkoAj8/edit?usp=sharing&ouid=102609333583581616395&rtpof=true&sd=true",
      },
      {
        name: "Introducción a Groupifier",
        url: "https://drive.google.com/file/d/1g-c-FKlteNpMq2WqefNmItSEgJ1iUwr3/view?usp=sharing",
      },
    ],
  },
];
