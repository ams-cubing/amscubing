import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function getRepoRootDir() {
  const currentDir =
    typeof import.meta.dirname === "string"
      ? import.meta.dirname
      : dirname(fileURLToPath(import.meta.url));

  return resolve(currentDir, "../../..");
}

if (!process.env.DATABASE_URL) {
  config({ path: resolve(getRepoRootDir(), ".env.local") });
}
