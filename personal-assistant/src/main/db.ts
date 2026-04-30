import path from "node:path";
import { app } from "electron";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

function migrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      pinned INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      dueAt TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none',
      status TEXT NOT NULL DEFAULT 'pending',
      notifyChannel TEXT NOT NULL DEFAULT 'desktop'
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      triggerType TEXT NOT NULL,
      triggerConfig TEXT NOT NULL,
      actionType TEXT NOT NULL,
      actionConfig TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS devices_cache (
      id TEXT PRIMARY KEY,
      entityId TEXT NOT NULL UNIQUE,
      friendlyName TEXT NOT NULL,
      domain TEXT NOT NULL,
      state TEXT NOT NULL,
      attributes TEXT NOT NULL,
      lastSeenAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id TEXT PRIMARY KEY,
      ruleId TEXT NOT NULL,
      status TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      endedAt TEXT NOT NULL,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
}

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = path.join(app.getPath("userData"), "assistant.db");
  db = new Database(dbPath);
  migrations(db);
  return db;
}
