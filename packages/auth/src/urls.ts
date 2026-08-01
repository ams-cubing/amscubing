/** Shared AMS app URLs for auth cookie / CORS. */

export function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

export function getCalendarUrl() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_CALENDAR_URL ??
      process.env.BETTER_AUTH_URL ??
      "http://localhost:3001",
  );
}

export function getBoardsUrl() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_BOARDS_URL ?? "http://localhost:3002",
  );
}

/** Canonical auth host (OAuth callbacks + auth API). Always the calendar app. */
export function getAuthBaseUrl() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_CALENDAR_URL ??
      process.env.BETTER_AUTH_URL ??
      "http://localhost:3001",
  );
}

export function getTrustedOrigins() {
  const origins = [getCalendarUrl(), getBoardsUrl(), getAuthBaseUrl()];

  // Always allow local app ports in development (avoids stale BETTER_AUTH_URL mismatches)
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3001", "http://localhost:3002");
  }

  return Array.from(
    new Set(
      origins.map(stripTrailingSlash).filter((origin) => origin.length > 0),
    ),
  );
}

/** e.g. `.amscubing.org` in production so calendario.* and tablero.* share cookies */
export function getAuthCookieDomain() {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  return domain || undefined;
}
