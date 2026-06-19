import { migration as familyMigration } from "../../db/migrations/008_family";
import { familyModule } from "../backup/modules/family";
import { registerFamilyHandlers } from "../../ipc/handlers/family.handlers";
import type { LifeAreaModule } from "./types";

export const familyLifeArea: LifeAreaModule = {
  id: "family",
  displayName: "Family",
  migrations: [
    {
      version: 8,
      name: "family",
      up: familyMigration.up,
      down: familyMigration.down
    }
  ],
  backupModule: familyModule,
  registerHandlers: registerFamilyHandlers
};
