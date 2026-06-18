import type Database from "better-sqlite3";
import { getTableColumnNames } from "../pragma";

export function up003AutomationLastFiredAt(database: Database.Database): void {
  const names = getTableColumnNames(database, "automation_rules");
  if (!names.has("lastFiredAt")) {
    database.exec("ALTER TABLE automation_rules ADD COLUMN lastFiredAt TEXT;");
  }
}
