import type Database from "better-sqlite3";
import { up001InitialSchema } from "./001_initial_schema";
import { up002ExecutionLogObservability } from "./002_execution_log_observability";
import { up003AutomationLastFiredAt } from "./003_automation_last_fired_at";
import { up004RendererErrors } from "./004_renderer_errors";
import { up005Tasks } from "./005_tasks";
import { up006Finance } from "./006_finance";
import { migration } from "./007_car";
import { migration as familyMigration } from "./008_family";
import { migration as healthMigration } from "./009_health";
import { migration as hobbiesMigration } from "./010_hobbies";
import { migration as connectedCalendarMigration } from "./011_connected_calendar";

export type Migration = {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  /** Optional rollback; SQLite cannot always drop columns—omit when unsafe. */
  down?: (db: Database.Database) => void;
};

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: "initial_schema", up: up001InitialSchema },
  { version: 2, name: "execution_log_observability", up: up002ExecutionLogObservability },
  { version: 3, name: "automation_last_fired_at", up: up003AutomationLastFiredAt },
  { version: 4, name: "renderer_errors", up: up004RendererErrors },
  { version: 5, name: "tasks", up: up005Tasks },
  { version: 6, name: "finance", up: up006Finance },
  { version: 7, name: "car", up: migration.up, down: migration.down },
  { version: 8, name: "family", up: familyMigration.up, down: familyMigration.down },
  { version: 9, name: "health", up: healthMigration.up, down: healthMigration.down },
  { version: 10, name: "hobbies", up: hobbiesMigration.up, down: hobbiesMigration.down },
  { version: 11, name: "connected_calendar", up: connectedCalendarMigration.up, down: connectedCalendarMigration.down }
] as const;
