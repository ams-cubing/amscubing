export function getCalendarUrl() {
  return (
    process.env.NEXT_PUBLIC_CALENDAR_URL ?? "http://localhost:3001"
  ).replace(/\/$/, "");
}

export function getBoardsUrl() {
  return (
    process.env.NEXT_PUBLIC_BOARDS_URL ?? "http://localhost:3002"
  ).replace(/\/$/, "");
}
