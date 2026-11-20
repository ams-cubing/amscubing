import { and, eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { account } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

const WCA_TOKEN_URL = "https://www.worldcubeassociation.org/oauth/token";
/** Refresh a minute early so WCIF calls do not race expiry. */
const REFRESH_SKEW_MS = 60_000;

export type WcaAccessTokenResult =
  | { ok: true; accessToken: string; scope: string | null }
  | {
      ok: false;
      reason:
        | "not_linked"
        | "missing_scope"
        | "refresh_failed"
        | "missing_credentials";
      message: string;
    };

export function hasManageCompetitionsScope(scope: string | null | undefined) {
  if (!scope) return false;
  return scope.split(/[\s,]+/).includes("manage_competitions");
}

type WcaAccountRow = {
  id: string;
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  scope: string | null;
  updatedAt: Date;
};

/** Prefer the real WCA OAuth subject (numeric user id) over legacy stub rows. */
export function pickWcaAccountRow(rows: WcaAccountRow[]): WcaAccountRow | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const aNumeric = /^\d+$/.test(a.accountId) ? 1 : 0;
    const bNumeric = /^\d+$/.test(b.accountId) ? 1 : 0;
    if (aNumeric !== bNumeric) return bNumeric - aNumeric;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  })[0]!;
}

async function refreshWcaAccessToken(row: {
  id: string;
  refreshToken: string | null;
}): Promise<
  | {
      ok: true;
      accessToken: string;
      scope: string | null;
      expiresAt: Date | null;
    }
  | {
      ok: false;
      reason: "refresh_failed" | "missing_credentials";
      message: string;
    }
> {
  const clientId = process.env.WCA_CLIENT_ID?.trim();
  const clientSecret = process.env.WCA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      reason: "missing_credentials",
      message: "Faltan credenciales OAuth de la WCA en el servidor.",
    };
  }
  if (!row.refreshToken) {
    return {
      ok: false,
      reason: "refresh_failed",
      message:
        "Tu enlace con la WCA expiró. Vuelve a conectar WCA desde Cuenta.",
    };
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: row.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response: Response;
  try {
    response = await fetch(WCA_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });
  } catch (error) {
    log.error("wca.token_refresh_network", { error });
    return {
      ok: false,
      reason: "refresh_failed",
      message: "No se pudo renovar el token de la WCA. Inténtalo de nuevo.",
    };
  }

  if (!response.ok) {
    log.warn("wca.token_refresh_failed", { status: response.status });
    return {
      ok: false,
      reason: "refresh_failed",
      message:
        "Tu enlace con la WCA expiró. Vuelve a conectar WCA desde Cuenta.",
    };
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!data.access_token) {
    return {
      ok: false,
      reason: "refresh_failed",
      message: "La WCA no devolvió un token válido.",
    };
  }

  const expiresAt =
    typeof data.expires_in === "number"
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;
  const scope = data.scope?.trim() || null;

  await db
    .update(account)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? row.refreshToken,
      accessTokenExpiresAt: expiresAt,
      // Persist scope when WCA returns it (Better Auth omits scope on re-login).
      ...(scope ? { scope } : {}),
      updatedAt: new Date(),
    })
    .where(eq(account.id, row.id));

  return {
    ok: true,
    accessToken: data.access_token,
    scope,
    expiresAt,
  };
}

/**
 * Returns a usable WCA access token for the AMS user.
 *
 * Do not gate on stored `account.scope`: Better Auth leaves it stale on re-login,
 * and force-refreshing just to "sync scope" can replace a freshly authorized
 * access token. WCIF 401/403 is the source of truth for permission failures.
 */
export async function getWcaAccessTokenForUser(
  userId: string,
): Promise<WcaAccessTokenResult> {
  const rows = await db.query.account.findMany({
    where: and(eq(account.userId, userId), eq(account.providerId, "wca")),
    columns: {
      id: true,
      accountId: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
      scope: true,
      updatedAt: true,
    },
  });

  const row = pickWcaAccountRow(rows);
  if (!row) {
    return {
      ok: false,
      reason: "not_linked",
      message:
        "Conecta tu cuenta WCA desde Cuenta para poder leer correos de competidores.",
    };
  }

  if (rows.length > 1) {
    log.warn("wca.duplicate_accounts", {
      userId,
      count: rows.length,
      chosenAccountId: row.accountId,
    });
  }

  let accessToken = row.accessToken;
  let scope = row.scope;

  const expired =
    !accessToken ||
    (row.accessTokenExpiresAt != null &&
      row.accessTokenExpiresAt.getTime() <= Date.now() + REFRESH_SKEW_MS);

  if (expired) {
    const refreshed = await refreshWcaAccessToken(row);
    if (!refreshed.ok) return refreshed;
    accessToken = refreshed.accessToken;
    if (refreshed.scope) scope = refreshed.scope;
  }

  if (!accessToken) {
    return {
      ok: false,
      reason: "refresh_failed",
      message:
        "Tu enlace con la WCA expiró. Vuelve a conectar WCA desde Cuenta.",
    };
  }

  if (!hasManageCompetitionsScope(scope)) {
    // Stale or incomplete scope column — still try the token. Log for ops.
    log.warn("wca.scope_column_missing_manage_competitions", {
      userId,
      accountId: row.accountId,
      scope,
    });
  }

  return { ok: true, accessToken, scope };
}
