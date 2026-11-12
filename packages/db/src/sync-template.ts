import "./env";

import {
  BOARD_TEMPLATE_KEYS,
  isBoardTemplateKey,
} from "./data/board-templates";
import { seedAmsBoardTemplate } from "./seed-board-template";

const arg = process.argv[2];
if (arg !== undefined && !isBoardTemplateKey(arg)) {
  console.error(
    `Usage: db:sync-template [${BOARD_TEMPLATE_KEYS.join("|")}] (default: all)`,
  );
  process.exit(1);
}

seedAmsBoardTemplate(arg ? [arg] : undefined)
  .then((ids) => {
    const summary = Object.entries(ids)
      .map(([key, id]) => `${key}=${id}`)
      .join(", ");
    console.log(`✅ Template + competition-board sync completed (${summary})`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Template sync failed");
    console.error(err);
    process.exit(1);
  });
