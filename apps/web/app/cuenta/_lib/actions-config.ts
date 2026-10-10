import {
  CalendarDays,
  CalendarPlus,
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

export type AccountSections = {
  member: AccountAction[];
  organization: AccountAction[];
};

export function getAccountSections({
  isDelegate,
  hasBlogPermission,
  hasCoursePermission,
  canManagePermissions,
  hasCompetitionActivity,
}: {
  isDelegate: boolean;
  hasBlogPermission: boolean;
  hasCoursePermission: boolean;
  canManagePermissions: boolean;
  hasCompetitionActivity: boolean;
}): AccountSections {
  const calendarUrl = getCalendarUrl();
  const blogUrl = getBlogUrl();

  const member: AccountAction[] = [
    hasCompetitionActivity
      ? {
          title: "Mis competencias",
          description:
            "Revisa tus solicitudes de fecha y las competencias que organizas.",
          href: `${calendarUrl}/mis-competencias`,
          icon: CalendarDays,
        }
      : {
          title: "Solicitar una fecha",
          description:
            "¿Quieres organizar una competencia? Solicita una fecha y te asignamos un delegado.",
          href: `${calendarUrl}/solicitar-fecha`,
          icon: CalendarPlus,
        },
    {
      title: "Blog",
      description:
        "Lee publicaciones de AMS y participa con tu cuenta AMS o WCA.",
      href: blogUrl,
      icon: MessageSquareText,
    },
    {
      title: "Mis cursos",
      description:
        "Aprende con las lecciones y evaluaciones de AMS y conserva tu avance.",
      href: `${COURSES_URL}/mis-cursos`,
      icon: GraduationCap,
    },
  ];

  const organization: AccountAction[] = [];
  if (isDelegate || canManagePermissions) {
    organization.push({
      title: "Panel de administración",
      description: isDelegate
        ? "Edita delegados públicos, redes y permisos del equipo AMS."
        : "Asigna permisos de Blog y Cursos al equipo AMS.",
      href: "/admin",
      icon: Newspaper,
    });
  }
  if (isDelegate) {
    organization.push(
      {
        title: "Crear competencias",
        description:
          "Abre el calendario para revisar solicitudes y administrar competencias.",
        href: `${calendarUrl}/panel/competencias/nueva`,
        icon: ShieldCheck,
      },
      {
        title: "Tableros de organización",
        description:
          "Coordina tareas, checklist, comentarios y responsables por competencia.",
        href: getBoardsUrl(),
        icon: LayoutDashboard,
      },
    );
  }
  if (isDelegate || hasBlogPermission) {
    organization.push({
      title: "Administrar Blog",
      description: "Crea entradas, organiza bloques y modera comentarios.",
      href: `${blogUrl}/admin`,
      icon: Newspaper,
    });
  }
  if (isDelegate || hasCoursePermission) {
    organization.push({
      title: "Administrar Cursos",
      description: "Crea cursos, lecciones y evaluaciones.",
      href: `${COURSES_URL}/admin`,
      icon: GraduationCap,
    });
  }

  const seen = new Set<string>();
  const unique = (actions: AccountAction[]) =>
    actions.filter((action) => {
      if (seen.has(action.href)) return false;
      seen.add(action.href);
      return true;
    });

  return { organization: unique(organization), member: unique(member) };
}
