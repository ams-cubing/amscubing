import type { Competition } from "@workspace/db/schema";

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
