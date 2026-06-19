import type { IpcMainInvokeEvent } from "electron";
import type { LifeAreaModule } from "./types";
import { financeLifeArea } from "./finance.module";
import { carLifeArea } from "./car.module";
import { familyLifeArea } from "./family.module";
import { healthLifeArea } from "./health.module";
import { hobbiesLifeArea } from "./hobbies.module";

/**
 * Registry of all life-area modules.
 * Modules are imported here and composed into the various registries (migrations, backup, IPC).
 */
export const LIFE_AREAS: readonly LifeAreaModule[] = [
  financeLifeArea,
  carLifeArea,
  familyLifeArea,
  healthLifeArea,
  hobbiesLifeArea
];

/**
 * Register IPC handlers for all life-area modules.
 */
export function registerLifeAreaHandlers(assertSender: (event: IpcMainInvokeEvent) => void): void {
  for (const area of LIFE_AREAS) {
    area.registerHandlers(assertSender);
  }
}
