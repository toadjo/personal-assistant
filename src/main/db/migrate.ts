import type Database from "better-sqlite3";
import { MIGRATIONS, type Migration } from "./migrations/registry";

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL
  );
`;

function ensureMigrationsTable(database: Database.Database): void {
  database.exec(MIGRATIONS_TABLE);
}

function appliedVersions(database: Database.Database): Set<number> {
  ensureMigrationsTable(database);
  const rows = database.prepare("SELECT version FROM schema_migrations").all() as Array<{ version: number }>;
  return new Set(rows.map((r) => r.version));
}

function recordMigration(database: Database.Database, migration: Migration, appliedAt: string): void {
  database
    .prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (@version, @name, @appliedAt)")
    .run({ version: migration.version, name: migration.name, appliedAt });
}

/**
 * Runs pending migrations in ascending version order inside a transaction per migration.
 */
export function runMigrations(database: Database.Database): void {
  ensureMigrationsTable(database);
  const done = appliedVersions(database);

  for (const migration of MIGRATIONS) {
    if (done.has(migration.version)) continue;
    const appliedAt = new Date().toISOString();
    const txn = database.transaction(() => {
      migration.up(database);
      recordMigration(database, migration, appliedAt);
    });
    txn();
  }
}

/**
 * Rolls back the latest applied migration if it defines a `down` function.
 * @throws If the latest migration has no `down` or nothing to roll back.
 */
export function rollbackLastMigration(database: Database.Database): void {
  ensureMigrationsTable(database);
  const row = database.prepare("SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1").get() as
    | { version: number; name: string }
    | undefined;
  if (!row) {
    throw new Error("No migrations to roll back.");
  }
  const migration = [...MIGRATIONS].reverse().find((m) => m.version === row.version);
  const down = migration?.down;
  if (!down) {
    throw new Error(`Migration "${row.name}" (v${row.version}) has no rollback script.`);
  }
  const txn = database.transaction(() => {
    down(database);
    database.prepare("DELETE FROM schema_migrations WHERE version = ?").run(row.version);
  });
  txn();
}
