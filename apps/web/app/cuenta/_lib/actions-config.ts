import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Newspaper,
  ShieldCheck,
} from "lucide-react";

import { getBlogUrl } from "@workspace/auth/urls";
import { COURSES_URL } from "@/lib/content";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";

export type AccountAction = {
  title: string;
  description: string;
  href: string;
  icon: typeof CalendarDays;
};

export const myCompetitionsAction: AccountAction = {
  title: "Mis competencias",
  description:
    "Revisa solicitudes y seguimiento de competencias vinculadas a tu cuenta AMS.",
  href: `${getCalendarUrl()}/mis-competencias`,
  icon: CalendarDays,
};

export const publicActions: AccountAction[] = [
  {
    title: "Comentar en el blog",
    description:
      "Lee publicaciones de AMS y participa con tu cuenta AMS o WCA.",
    href: getBlogUrl(),
    icon: MessageSquareText,
  },
  {
    title: "Tomar cursos",
    description:
      "Aprende con las lecciones y evaluaciones de AMS y conserva tu avance.",
    href: COURSES_URL,
    icon: GraduationCap,
  },
];

export const delegateActions: AccountAction[] = [
  {
    title: "Panel de administración",
    description:
      "Edita delegados públicos, ubicaciones y contenido del sitio AMS.",
    href: "/admin",
    icon: Newspaper,
  },
  {
    title: "Crear competencias",
    description:
      "Abre el calendario de AMS para solicitar fechas, revisar procesos y administrar competencias.",
    href: `${getCalendarUrl()}/panel/competencias/nueva`,
    icon: ShieldCheck,
  },
  {
    title: "Tableros de organización",
    description:
      "Coordina tareas, checklist, comentarios y responsables para competencias asignadas.",
    href: getBoardsUrl(),
    icon: LayoutDashboard,
  },
  {
    title: "Crear cursos",
    description:
      "Entrada al LMS dedicado para administrar material de capacitación y rutas de aprendizaje.",
    href: COURSES_URL,
    icon: BookOpen,
  },
];

export const editorActions: AccountAction[] = [
  {
    title: "Explorar Blog",
    description:
      "Lee las publicaciones de AMS. La gestión editorial tiene permisos propios, separados de Cursos.",
    href: getBlogUrl(),
    icon: Newspaper,
  },
];

export function getScopedActions({
  isDelegate,
  hasBlogPermission,
  hasCoursePermission,
}: {
  isDelegate: boolean;
  hasBlogPermission: boolean;
  hasCoursePermission: boolean;
}): AccountAction[] {
  return [
    ...(isDelegate || hasBlogPermission
      ? [
          {
            title: "Administrar Blog",
            description:
              "Crea entradas, organiza bloques y modera comentarios.",
            href: `${getBlogUrl()}/admin`,
            icon: Newspaper,
          },
        ]
      : []),
    ...(isDelegate || hasCoursePermission
      ? [
          {
            title: "Administrar Cursos",
            description: "Crea cursos, lecciones y evaluaciones.",
            href: `${COURSES_URL}/admin`,
            icon: GraduationCap,
          },
        ]
      : []),
  ];
}
