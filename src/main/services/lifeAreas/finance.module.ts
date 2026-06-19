import { up006Finance } from "../../db/migrations/006_finance";
import { financeModule } from "../backup/modules/finance";
import { registerFinanceHandlers } from "../../ipc/handlers/finance.handlers";
import type { LifeAreaModule } from "./types";

export const financeLifeArea: LifeAreaModule = {
  id: "finance",
  displayName: "Finance",
  migrations: [
    {
      version: 6,
      name: "finance",
      up: up006Finance
    }
  ],
  backupModule: financeModule,
  registerHandlers: registerFinanceHandlers
};
