export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  await import("@workspace/db/env");
  const { assertEnv, mergeEnvSpecs, coreEnv } =
    await import("@workspace/server/env");
  assertEnv("courses", mergeEnvSpecs(coreEnv));
}
