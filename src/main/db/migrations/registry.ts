import type Database from "better-sqlite3";
import { up001InitialSchema } from "./001_initial_schema";
import { up002ExecutionLogObservability } from "./002_execution_log_observability";
import { up003AutomationLastFiredAt } from "./003_automation_last_fired_at";

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
  { version: 3, name: "automation_last_fired_at", up: up003AutomationLastFiredAt }
] as const;
