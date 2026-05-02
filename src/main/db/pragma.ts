import type Database from "better-sqlite3";
import { z } from "zod";

/** Row shape from `PRAGMA table_info(...)` (SQLite). */
const tableInfoRowSchema = z.object({
  cid: z.number().optional(),
  name: z.string(),
  type: z.string().optional(),
  notnull: z.number().optional(),
  dflt_value: z.unknown().optional(),
  pk: z.number().optional()
});

export type TableInfoRow = z.infer<typeof tableInfoRowSchema>;

export type TableInfoName = "execution_logs" | "automation_rules";

/** Returns validated column names for a table (table name must be a safe literal). */
export function getTableColumnNames(database: Database.Database, tableName: TableInfoName): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all();
  const names = new Set<string>();
  for (const row of rows) {
    const parsed = tableInfoRowSchema.safeParse(row);
    if (parsed.success) names.add(parsed.data.name);
  }
  return names;
}
