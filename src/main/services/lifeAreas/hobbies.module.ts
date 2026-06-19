import { migration as hobbiesMigration } from "../../db/migrations/010_hobbies";
import { hobbiesModule } from "../backup/modules/hobbies";
import { registerHobbiesHandlers } from "../../ipc/handlers/hobbies.handlers";
import type { LifeAreaModule } from "./types";

export const hobbiesLifeArea: LifeAreaModule = {
  id: "hobbies",
  displayName: "Hobbies",
  migrations: [
    {
      version: 10,
      name: "hobbies",
      up: hobbiesMigration.up,
      down: hobbiesMigration.down
    }
  ],
  backupModule: hobbiesModule,
  registerHandlers: registerHobbiesHandlers
};
