import { migration as healthMigration } from "../../db/migrations/009_health";
import { healthModule } from "../backup/modules/health";
import { registerHealthHandlers } from "../../ipc/handlers/health.handlers";
import type { LifeAreaModule } from "./types";

export const healthLifeArea: LifeAreaModule = {
  id: "health",
  displayName: "Health",
  migrations: [
    {
      version: 9,
      name: "health",
      up: healthMigration.up,
      down: healthMigration.down
    }
  ],
  backupModule: healthModule,
  registerHandlers: registerHealthHandlers
};
