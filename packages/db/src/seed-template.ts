import "./env";

import {
  BOARD_TEMPLATE_KEYS,
  isBoardTemplateKey,
} from "./data/board-templates";
import { reseedAmsBoardTemplate } from "./seed-board-template";

const arg = process.argv[2];
if (arg !== undefined && !isBoardTemplateKey(arg)) {
  console.error(
    `Usage: db:seed-template [${BOARD_TEMPLATE_KEYS.join("|")}] (default: all)`,
  );
  process.exit(1);
}
const keys = arg ? [arg] : BOARD_TEMPLATE_KEYS;

(async () => {
  for (const key of keys) {
    const boardId = await reseedAmsBoardTemplate(key);
    console.log(`✅ Template reseed completed (${key}, id=${boardId})`);
  }
})()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Template reseed failed");
    console.error(err);
    process.exit(1);
  });
