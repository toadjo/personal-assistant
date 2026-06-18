import type Database from "better-sqlite3";

export function up005Tasks(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      dueAt TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'open',
      recurrence TEXT NOT NULL DEFAULT 'none',
      notifyChannel TEXT NOT NULL DEFAULT 'desktop',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastCompletedAt TEXT
    );
  `);
}
