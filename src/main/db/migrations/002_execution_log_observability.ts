import type Database from "better-sqlite3";
import { getTableColumnNames } from "../pragma";

/** Adds retry/attempt observability columns to execution_logs (SQLite-safe, idempotent). */
export function up002ExecutionLogObservability(database: Database.Database): void {
  const columnNames = getTableColumnNames(database, "execution_logs");
  if (!columnNames.has("attemptCount")) {
    database.exec("ALTER TABLE execution_logs ADD COLUMN attemptCount INTEGER NOT NULL DEFAULT 1;");
  }
  if (!columnNames.has("retryCount")) {
    database.exec("ALTER TABLE execution_logs ADD COLUMN retryCount INTEGER NOT NULL DEFAULT 0;");
  }
}
