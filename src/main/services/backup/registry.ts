import type { BackupModule } from "./types";
import { notesModule } from "./modules/notes";
import { remindersModule } from "./modules/reminders";
import { tasksModule } from "./modules/tasks";
import { automationModule } from "./modules/automation";
import { connectedCalendarModule } from "./modules/connectedCalendar";
import { settingsModule } from "./modules/settings";
import { financeLifeArea } from "../lifeAreas/finance.module";
import { carLifeArea } from "../lifeAreas/car.module";
import { familyLifeArea } from "../lifeAreas/family.module";
import { healthLifeArea } from "../lifeAreas/health.module";
import { hobbiesLifeArea } from "../lifeAreas/hobbies.module";

/** FK-safe import order; delete in reverse. */
export const BACKUP_MODULES: readonly BackupModule[] = [
  notesModule,
  remindersModule,
  tasksModule,
  automationModule,
  financeLifeArea.backupModule,
  carLifeArea.backupModule,
  familyLifeArea.backupModule,
  healthLifeArea.backupModule,
  hobbiesLifeArea.backupModule,
  connectedCalendarModule,
  settingsModule
];

export const BACKUP_KNOWN_PAYLOAD_KEYS: readonly string[] = BACKUP_MODULES.flatMap((module) => module.payloadKeys);
