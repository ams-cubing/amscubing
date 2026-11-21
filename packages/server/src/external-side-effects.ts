type Env = Record<string, string | undefined>;

/** Prefix for fake Meta ids written when publish is simulated. */
export const SIMULATED_EXTERNAL_ID_PREFIX = "sim:";

/**
 * Live Meta / Resend side effects only on the real production deploy.
 *
 * Staging (`beta.*`, `VERCEL_ENV=preview`) and local never post or email for
 * real. Overrides:
 * - `AMS_EXTERNAL_DRY_RUN=1` → always simulate
 * - `AMS_LIVE_EXTERNAL=1` → force live (escape hatch; use carefully)
 */
export function isLiveExternalSideEffectsEnabled(
  env: Env = process.env,
): boolean {
  if (isTruthy(env.AMS_EXTERNAL_DRY_RUN)) return false;
  if (isTruthy(env.AMS_LIVE_EXTERNAL)) return true;

  if (hasNonProductionHostname(env)) return false;

  return env.VERCEL_ENV === "production";
}

export function isSimulatedExternalId(
  id: string | null | undefined,
): boolean {
  return Boolean(id?.startsWith(SIMULATED_EXTERNAL_ID_PREFIX));
}

export function simulatedExternalId(kind: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${SIMULATED_EXTERNAL_ID_PREFIX}${kind}:${suffix}`;
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function hasNonProductionHostname(env: Env): boolean {
  for (const key of [
    "NEXT_PUBLIC_WEB_URL",
    "NEXT_PUBLIC_CALENDAR_URL",
    "NEXT_PUBLIC_BOARDS_URL",
    "BETTER_AUTH_URL",
  ] as const) {
    const raw = env[key]?.trim();
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (
        host === "localhost" ||
        host.endsWith(".local") ||
        host.startsWith("beta.") ||
        host.endsWith(".vercel.app")
      ) {
        return true;
      }
    } catch {
      // ignore invalid URLs; env validation catches them elsewhere
    }
  }
  return false;
}
