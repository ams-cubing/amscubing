import "./env";

import { seedAmsBoardTemplate } from "./seed-board-template";

seedAmsBoardTemplate()
  .then((boardId) => {
    console.log(
      `✅ Template + competition-board sync completed (template id=${boardId})`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Template sync failed");
    console.error(err);
    process.exit(1);
  });
