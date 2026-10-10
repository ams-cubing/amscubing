export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  await import("@workspace/db/env");
  const { assertEnv, mergeEnvSpecs, coreEnv, emailEnv, uploadthingEnv } =
    await import("@workspace/server/env");
  assertEnv("boards", mergeEnvSpecs(coreEnv, emailEnv, uploadthingEnv));
}
