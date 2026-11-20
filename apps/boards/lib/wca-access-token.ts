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

const MISSING_SCOPE_MESSAGE =
  "Tu sesión WCA no incluye el permiso manage_competitions. En la app OAuth de la WCA agrega ese scope, cierra sesión aquí y vuelve a iniciar con WCA desde Cuenta.";

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
        "Tu enlace con la WCA expiró. Vuelve a iniciar sesión con WCA desde tu cuenta.",
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
        "Tu enlace con la WCA expiró. Vuelve a iniciar sesión con WCA desde tu cuenta.",
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

/** Returns a usable WCA access token for the AMS user, refreshing when needed. */
export async function getWcaAccessTokenForUser(
  userId: string,
): Promise<WcaAccessTokenResult> {
  const row = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "wca")),
    columns: {
      id: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
      scope: true,
    },
  });

  if (!row) {
    return {
      ok: false,
      reason: "not_linked",
      message:
        "Vincula tu cuenta WCA desde Cuenta para poder leer correos de competidores.",
    };
  }

  let accessToken = row.accessToken;
  let scope = row.scope;

  const expired =
    !accessToken ||
    (row.accessTokenExpiresAt != null &&
      row.accessTokenExpiresAt.getTime() <= Date.now() + REFRESH_SKEW_MS);

  // Better Auth updates tokens on re-login but intentionally leaves `account.scope`
  // stale. Refresh against WCA to resync granted scopes (incl. manage_competitions).
  const needsScopeSync = !hasManageCompetitionsScope(scope);

  if (expired || needsScopeSync) {
    const refreshed = await refreshWcaAccessToken(row);
    if (!refreshed.ok) {
      if (expired || !accessToken) return refreshed;
      log.warn("wca.scope_sync_refresh_failed", {
        userId,
        reason: refreshed.reason,
      });
    } else {
      accessToken = refreshed.accessToken;
      if (refreshed.scope) scope = refreshed.scope;
    }
  }

  if (!accessToken) {
    return {
      ok: false,
      reason: "refresh_failed",
      message:
        "Tu enlace con la WCA expiró. Vuelve a iniciar sesión con WCA desde tu cuenta.",
    };
  }

  if (!hasManageCompetitionsScope(scope)) {
    return {
      ok: false,
      reason: "missing_scope",
      message: MISSING_SCOPE_MESSAGE,
    };
  }

  return { ok: true, accessToken, scope };
}
