import type { BackupModule } from "./types";
import { notesModule } from "./modules/notes";
import { remindersModule } from "./modules/reminders";
import { tasksModule } from "./modules/tasks";
import { automationModule } from "./modules/automation";
import { financeModule } from "./modules/finance";
import { carModule } from "./modules/car";
import { familyModule } from "./modules/family";
import { healthModule } from "./modules/health";
import { hobbiesModule } from "./modules/hobbies";
import { connectedCalendarModule } from "./modules/connectedCalendar";
import { settingsModule } from "./modules/settings";

/** FK-safe import order; delete in reverse. */
export const BACKUP_MODULES: readonly BackupModule[] = [
  notesModule,
  remindersModule,
  tasksModule,
  automationModule,
  financeModule,
  carModule,
  familyModule,
  healthModule,
  hobbiesModule,
  connectedCalendarModule,
  settingsModule
];

export const BACKUP_KNOWN_PAYLOAD_KEYS: readonly string[] = BACKUP_MODULES.flatMap((module) => module.payloadKeys);
