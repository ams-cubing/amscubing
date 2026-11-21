import { getBoardsUrl, getCalendarUrl } from "@workspace/auth/urls";

export function notificationAppUrls() {
  return {
    calendarUrl: getCalendarUrl(),
    boardsUrl: getBoardsUrl(),
  };
}
