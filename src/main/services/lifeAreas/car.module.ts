import { migration as carMigration } from "../../db/migrations/007_car";
import { carModule } from "../backup/modules/car";
import { registerCarHandlers } from "../../ipc/handlers/car.handlers";
import type { LifeAreaModule } from "./types";

export const carLifeArea: LifeAreaModule = {
  id: "car",
  displayName: "Car Maintenance",
  migrations: [
    {
      version: 7,
      name: "car",
      up: carMigration.up,
      down: carMigration.down
    }
  ],
  backupModule: carModule,
  registerHandlers: registerCarHandlers
};
