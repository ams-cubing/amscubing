import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { user } from "@workspace/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";

import { getAuthBaseUrl, getAuthCookieDomain, getTrustedOrigins } from "./urls";

interface WCAProfile {
  me: {
    id: number;
    created_at?: string;
    updated_at?: string;
    name: string;
    wca_id: string;
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

/**
 * Shared Better Auth instance for AMS apps (calendar + boards).
 * Uses a common cookie prefix and optional AUTH_COOKIE_DOMAIN so sessions
 * are shared across localhost ports (dev) or amscubing.org subdomains (prod).
 */
export function createAuth() {
  const authBaseUrl = getAuthBaseUrl();
  const cookieDomain = getAuthCookieDomain();
  const isProd = process.env.NODE_ENV === "production";

  return betterAuth({
    baseURL: authBaseUrl,
    secret: process.env.BETTER_AUTH_SECRET,
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
          required: true,
          unique: true,
        },
        role: {
          type: ["delegate", "user"],
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

              let role = "user";
              if (data.me.delegate_status) {
                role = "delegate";
              }

              // Prefer a seeded row (matched by WCA ID) so region/title survive login.
              const existing = data.me.wca_id
                ? await db.query.user.findFirst({
                    where: eq(user.wcaId, data.me.wca_id),
                  })
                : null;

              return {
                id: existing?.id ?? String(data.me.id),
                name: data.me.name,
                email: data.me.email,
                image: data.me.avatar?.thumb_url,
                emailVerified: true,
                wcaId: data.me.wca_id,
                role,
                regionId: existing?.regionId ?? null,
                delegateTitle: existing?.delegateTitle ?? null,
                delegateLocation: existing?.delegateLocation ?? null,
              };
            },
            mapProfileToUser: (profile: Record<string, unknown>) => {
              if (!profile.wcaId || !profile.role) {
                throw new Error("Invalid profile: missing wcaId or role");
              }
              return {
                id: profile.id as string,
                name: profile.name as string,
                email: profile.email as string,
                image: profile.image as string | undefined,
                wcaId: profile.wcaId as string,
                role: profile.role as "delegate" | "user",
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
