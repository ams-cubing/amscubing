import { z } from "zod";

import { log } from "./log";

export type EnvSpec = {
  /** Must be set in every environment. */
  required?: readonly string[];
  /** Must be set when NODE_ENV=production; dev falls back to code defaults. */
  requiredInProduction?: readonly string[];
  /** Feature toggles: missing values only produce a startup warning. */
  optional?: readonly string[];
};

export type EnvReport = {
  missing: string[];
  invalid: { key: string; message: string }[];
  missingOptional: string[];
};

type Env = Record<string, string | undefined>;

const urlSchema = z.url();

const formats: Record<string, z.ZodType<string>> = {
  BETTER_AUTH_SECRET: z.string().min(32, "debe tener al menos 32 caracteres"),
};

function formatFor(key: string): z.ZodType<string> | undefined {
  if (formats[key]) return formats[key];
  if (key.endsWith("_URL") && key !== "DATABASE_URL") return urlSchema;
  return undefined;
}

function isSet(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

export function checkEnv(spec: EnvSpec, env: Env = process.env): EnvReport {
  const isProd = env.NODE_ENV === "production";
  const required = [
    ...(spec.required ?? []),
    ...(isProd ? (spec.requiredInProduction ?? []) : []),
  ];
  const all = new Set([
    ...(spec.required ?? []),
    ...(spec.requiredInProduction ?? []),
    ...(spec.optional ?? []),
  ]);

  const report: EnvReport = { missing: [], invalid: [], missingOptional: [] };

  for (const key of required) {
    if (!isSet(env[key])) report.missing.push(key);
  }
  for (const key of spec.optional ?? []) {
    if (!isSet(env[key])) report.missingOptional.push(key);
  }
  for (const key of all) {
    const value = env[key];
    const format = formatFor(key);
    if (!isSet(value) || !format) continue;
    const result = format.safeParse(value);
    if (!result.success) {
      report.invalid.push({
        key,
        message: result.error.issues[0]?.message ?? "valor inválido",
      });
    }
  }

  return report;
}

/** Throws on missing/invalid required vars; warns about missing optional ones. */
export function assertEnv(app: string, spec: EnvSpec, env: Env = process.env) {
  const report = checkEnv(spec, env);

  if (report.missingOptional.length > 0) {
    log.warn("env.missing_optional", { app, keys: report.missingOptional });
  }

  if (report.missing.length > 0 || report.invalid.length > 0) {
    const lines = [
      ...report.missing.map((key) => `  - ${key}: falta`),
      ...report.invalid.map(({ key, message }) => `  - ${key}: ${message}`),
    ];
    throw new Error(
      `[${app}] Variables de entorno inválidas:\n${lines.join("\n")}`,
    );
  }
}

export const coreEnv = {
  required: ["DATABASE_URL"],
  requiredInProduction: [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "NEXT_PUBLIC_WEB_URL",
    "NEXT_PUBLIC_CALENDAR_URL",
    "NEXT_PUBLIC_BOARDS_URL",
  ],
} as const satisfies EnvSpec;

export const wcaOAuthEnv = {
  requiredInProduction: ["WCA_CLIENT_ID", "WCA_CLIENT_SECRET"],
} as const satisfies EnvSpec;

export const metaEnv = {
  optional: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN", "META_IG_USER_ID"],
} as const satisfies EnvSpec;

export const emailEnv = {
  optional: ["RESEND_API_KEY"],
} as const satisfies EnvSpec;

export const uploadthingEnv = {
  optional: ["UPLOADTHING_TOKEN"],
} as const satisfies EnvSpec;

export function mergeEnvSpecs(...specs: EnvSpec[]): EnvSpec {
  return {
    required: specs.flatMap((spec) => spec.required ?? []),
    requiredInProduction: specs.flatMap(
      (spec) => spec.requiredInProduction ?? [],
    ),
    optional: specs.flatMap((spec) => spec.optional ?? []),
  };
}
