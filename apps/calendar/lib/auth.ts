import { db } from "@workspace/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";

interface WCAProfile {
  me: {
    id: number;
    created_at: string;
    updated_at: string;
    name: string;
    wca_id: string;
    gender: string;
    country_iso2: string;
    url: string;
    country: {
      id: string;
      name: string;
      continentId: string;
      iso2: string;
    };
    delegate_status: string | null;
    // teams: any[];
    avatar: {
      id: number;
      status: string;
      thumbnail_crop_x: null;
      thumbnail_crop_y: null;
      thumbnail_crop_w: null;
      thumbnail_crop_h: null;
      url: string;
      thumb_url: string;
      is_default: boolean;
      can_edit_thumbnail: boolean;
    };
    email: string;
  };
}

export const auth = betterAuth({
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
          redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/wca`,
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

            return {
              id: String(data.me.id),
              name: data.me.name,
              email: data.me.email,
              image: data.me.avatar?.thumb_url,
              emailVerified: true,

              wcaId: data.me.wca_id,
              role,
              // regionId: null,
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
              role: profile.role as "delegate" | "organizer" | "user",
              regionId: profile.regionId as string | null,
            };
          },
          overrideUserInfo: true,
        },
      ],
    }),
    nextCookies(),
  ],
});
