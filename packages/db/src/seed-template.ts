import "./env";

import { reseedAmsBoardTemplate } from "./seed-board-template";

reseedAmsBoardTemplate()
  .then((boardId) => {
    console.log(`✅ Template reseed completed (id=${boardId})`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Template reseed failed");
    console.error(err);
    process.exit(1);
  });
