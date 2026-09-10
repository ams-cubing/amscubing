/** Shared AMS app URLs for auth cookie / CORS. */

export function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

export function getCalendarUrl() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_CALENDAR_URL ?? "http://localhost:3001",
  );
}

export function getWebUrl() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_WEB_URL ??
      process.env.BETTER_AUTH_URL ??
      "http://localhost:3000",
  );
}

export function getBoardsUrl() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_BOARDS_URL ?? "http://localhost:3002",
  );
}

/** Canonical auth host (OAuth callbacks + auth API). Defaults to the public web app. */
export function getAuthBaseUrl() {
  return stripTrailingSlash(
    process.env.BETTER_AUTH_URL ??
      process.env.NEXT_PUBLIC_WEB_URL ??
      "http://localhost:3000",
  );
}

export function getTrustedOrigins() {
  const origins = [
    getWebUrl(),
    getCalendarUrl(),
    getBoardsUrl(),
    getAuthBaseUrl(),
  ];

  // Always allow local app ports in development (avoids stale BETTER_AUTH_URL mismatches)
  if (process.env.NODE_ENV !== "production") {
    origins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    );
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

/** OAuth callback targets we allow after sign-in (boards, calendar, same-app paths). */
export function isAllowedReturnTo(returnTo: string) {
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return true;
  }

  try {
    const origin = stripTrailingSlash(new URL(returnTo).origin);
    return getTrustedOrigins().some(
      (allowed) => stripTrailingSlash(allowed) === origin,
    );
  } catch {
    return false;
  }
}

/**
 * Auth-hosted login page for cross-app sign-in.
 * OAuth must start same-origin on the auth host; fetch from another app is blocked by CORS.
 */
export function getCrossAppSignInUrl(returnTo: string) {
  const url = new URL(`${getAuthBaseUrl()}/iniciar-sesion`);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}
