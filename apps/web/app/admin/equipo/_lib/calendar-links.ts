import { getCalendarUrl } from "@/lib/urls";

export function competitionPanelUrl(competitionId: number) {
  return `${getCalendarUrl()}/panel/competencias/${competitionId}`;
}

export function competitionEquipmentSheetUrl(competitionId: number) {
  return `${competitionPanelUrl(competitionId)}/equipo/ficha`;
}
