import type { Competition, Logs } from "@workspace/db/schema";

export function formatPublicStatus(
  status: Competition["statusPublic"],
): string {
  switch (status) {
    case "open":
      return "Fecha Abierta";
    case "reserved":
      return "Fecha Reservada";
    case "confirmed":
      return "Sede Confirmada";
    case "announced":
      return "Anunciada";
    case "suspended":
      return "Suspendida";
    case "unavailable":
      return "No disponible";
    default:
      return status;
  }
}

export function formatInternalStatus(
  status: Competition["statusInternal"],
): string {
  switch (status) {
    case "asked_for_help":
      return "Solicitando ayuda";
    case "looking_for_venue":
      return "Buscando sede";
    case "venue_found":
      return "Sede encontrada";
    case "wca_approved":
      return "Aprobado por la WCA";
    case "registration_open":
      return "Registro abierto";
    case "celebrated":
      return "Celebrado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export function getPublicStatusColor(
  status: Competition["statusPublic"],
): string {
  switch (status) {
    case "open":
      return "bg-pink-300 dark:bg-pink-600 text-pink-800 dark:text-pink-900 hover:bg-pink-200 dark:hover:bg-pink-300";
    case "reserved":
      return "bg-yellow-300 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-300";
    case "confirmed":
      return "bg-orange-300 dark:bg-orange-600 text-orange-800 dark:text-orange-900 hover:bg-orange-200 dark:hover:bg-orange-300";
    case "announced":
      return "bg-green-300 dark:bg-green-600 text-green-800 dark:text-green-900 hover:bg-green-200 dark:hover:bg-green-300";
    case "suspended":
      return "bg-red-400 dark:bg-red-700 text-red-800 dark:text-red-900 hover:bg-red-300 dark:hover:bg-red-600";
    case "unavailable":
    default:
      return "bg-gray-400 dark:bg-gray-700 text-gray-800 dark:text-gray-900 hover:bg-gray-300 dark:hover:bg-gray-600";
  }
}

export function getInternalStatusColor(
  status: Competition["statusInternal"],
): string {
  switch (status) {
    case "asked_for_help":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-200 dark:text-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-300";
    case "looking_for_venue":
      return "bg-orange-100 text-orange-800 dark:bg-orange-200 dark:text-orange-900 hover:bg-orange-200 dark:hover:bg-orange-300";
    case "venue_found":
      return "bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-900 hover:bg-blue-200 dark:hover:bg-blue-300";
    case "wca_approved":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-200 dark:text-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-300";
    case "registration_open":
      return "bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900 hover:bg-green-200 dark:hover:bg-green-300";
    case "celebrated":
      return "bg-purple-100 text-purple-800 dark:bg-purple-200 dark:text-purple-900 hover:bg-purple-200 dark:hover:bg-purple-300";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900 hover:bg-red-200 dark:hover:bg-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-200 dark:text-gray-900 hover:bg-gray-200 dark:hover:bg-gray-300";
  }
}

export const formatAction = (action: Logs["action"]) => {
  switch (action) {
    case "create_competition":
      return "Creó una competencia";
    case "update_competition":
      return "Actualizó una competencia";
    case "delete_competition":
      return "Eliminó una competencia";
    case "send_ultimatum":
      return "Envió un ultimátum";
    case "submit_availability":
      return "Actualizó su disponibilidad";
    default:
      return action;
  }
};
