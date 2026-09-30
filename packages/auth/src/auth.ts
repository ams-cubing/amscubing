import { db } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { account, user } from "@workspace/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";

import { claimWcaStubUser } from "./claim-wca-stub";
import { mergeUserIntoStub } from "./merge-wca-user";
import { getAuthBaseUrl, getAuthCookieDomain, getTrustedOrigins } from "./urls";
import { resolveWcaRole } from "./wca-role";

interface WCAProfile {
  me: {
    id: number;
    created_at?: string;
    updated_at?: string;
    name: string;
    /** Null when the WCA account has never competed. */
    wca_id: string | null;
    gender?: string;
    country_iso2?: string;
    url?: string;
    delegate_status: string | null;
    avatar?: {
      thumb_url: string;
    };
    email: string;
  };
}

async function findUserWithoutWcaIdByAccount(wcaAccountId: string) {
  const [row] = await db
    .select({ id: user.id })
    .from(account)
    .innerJoin(user, eq(user.id, account.userId))
    .where(
      and(
        eq(account.providerId, "wca"),
        eq(account.accountId, wcaAccountId),
        isNull(user.wcaId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Shared Better Auth instance for AMS apps (calendar + boards).
 * Uses a common cookie prefix and optional AUTH_COOKIE_DOMAIN so sessions
 * are shared across localhost ports (dev) or amscubing.org subdomains (prod).
 */
export function createAuth() {
  const authBaseUrl = getAuthBaseUrl();
  const cookieDomain = getAuthCookieDomain();
  const isProd = process.env.NODE_ENV === "production";
  const secret =
    process.env.BETTER_AUTH_SECRET ??
    (isProd ? undefined : "dev-secret-change-me-at-least-32-chars");

  return betterAuth({
    baseURL: authBaseUrl,
    secret,
    trustedOrigins: getTrustedOrigins,
    advanced: {
      cookiePrefix: "ams",
      ...(cookieDomain
        ? {
            crossSubDomainCookies: {
              enabled: true,
              domain: cookieDomain,
            },
          }
        : {}),
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: isProd || Boolean(cookieDomain),
        path: "/",
        httpOnly: true,
      },
    },
    user: {
      additionalFields: {
        wcaId: {
          type: "string",
          required: false,
          unique: true,
        },
        role: {
          type: ["delegate", "user", "editor"],
          required: true,
          defaultValue: "user",
          input: false,
        },
        regionId: {
          type: "string",
          input: false,
        },
        delegateTitle: {
          type: "string",
          required: false,
          input: false,
        },
        delegateLocation: {
          type: "string",
          required: false,
          input: false,
        },
        lastLogin: {
          type: "date",
          defaultValue: () => new Date(),
        },
      },
    },
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "wca",
            clientId: process.env.WCA_CLIENT_ID || "",
            clientSecret: process.env.WCA_CLIENT_SECRET || "",
            redirectURI: `${authBaseUrl}/api/auth/callback/wca`,
            discoveryUrl:
              "https://www.worldcubeassociation.org/.well-known/openid-configuration",
            scopes: ["public", "email"],
            getUserInfo: async ({ accessToken }) => {
              const response = await fetch(
                "https://www.worldcubeassociation.org/api/v0/me",
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                },
              );

              const data = (await response.json()) as WCAProfile;
              const wcaId = data.me.wca_id || null;

              // Prefer a seeded/stub row (matched by WCA ID) so region/title/role
              // survive login. Claim placeholders to the real email so Better Auth
              // finds the user by email and links instead of inserting a duplicate.
              const existing = wcaId
                ? await db.query.user.findFirst({
                    where: eq(user.wcaId, wcaId),
                  })
                : null;

              if (existing) {
                const earlier = await findUserWithoutWcaIdByAccount(
                  String(data.me.id),
                );
                if (earlier && earlier.id !== existing.id) {
                  await mergeUserIntoStub(earlier.id, existing.id);
                }
              }

              const role = resolveWcaRole({
                delegateStatus: data.me.delegate_status,
                existingRole: existing?.role,
              });

              const claimed = existing
                ? await claimWcaStubUser(existing, {
                    email: data.me.email,
                    name: data.me.name,
                    image: data.me.avatar?.thumb_url,
                    role,
                    regionId: existing.regionId,
                    delegateTitle: existing.delegateTitle,
                    delegateLocation: existing.delegateLocation,
                  })
                : null;

              return {
                id: claimed?.id ?? String(data.me.id),
                name: claimed?.name ?? data.me.name,
                email: claimed?.email ?? data.me.email,
                image: claimed?.image ?? data.me.avatar?.thumb_url,
                emailVerified: true,
                wcaId,
                role,
                regionId: claimed?.regionId ?? null,
                delegateTitle: claimed?.delegateTitle ?? null,
                delegateLocation: claimed?.delegateLocation ?? null,
              };
            },
            mapProfileToUser: (profile: Record<string, unknown>) => {
              if (!profile.role) {
                throw new Error("Invalid profile: missing role");
              }
              return {
                id: profile.id as string,
                name: profile.name as string,
                email: profile.email as string,
                image: profile.image as string | undefined,
                wcaId: (profile.wcaId as string | null | undefined) ?? null,
                role: profile.role as "delegate" | "user" | "editor",
                regionId: profile.regionId as string | null,
                delegateTitle: profile.delegateTitle as string | null,
                delegateLocation: profile.delegateLocation as string | null,
              };
            },
            overrideUserInfo: true,
          },
        ],
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
