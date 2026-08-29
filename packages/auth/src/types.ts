import type { User } from "@workspace/db/schema";

/** Session user aligned with the Drizzle `User` row. */
export type SessionUser = User;

/**
 * Loose shape returned by Better Auth `getSession().user` before normalization.
 * Fields may be missing or use undefined instead of null.
 */
export type RawSessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  wcaId: string;
  role: string;
  regionId?: string | null;
  delegateTitle?: string | null;
  delegateLocation?: string | null;
  lastLogin?: Date | string | null;
};

function asDate(value: Date | string | null | undefined, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function asNullableDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/**
 * Normalize Better Auth's session user into the Drizzle `User` shape so apps
 * never need `as unknown as User` casts.
 */
export function toSessionUser(raw: RawSessionUser): SessionUser {
  const now = new Date();
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    emailVerified: raw.emailVerified ?? false,
    image: raw.image ?? null,
    createdAt: asDate(raw.createdAt, now),
    updatedAt: asDate(raw.updatedAt, now),
    wcaId: raw.wcaId,
    role: raw.role === "delegate" ? "delegate" : "user",
    regionId: raw.regionId ?? null,
    delegateTitle: raw.delegateTitle ?? null,
    delegateLocation: raw.delegateLocation ?? null,
    lastLogin: asNullableDate(raw.lastLogin),
  };
}
