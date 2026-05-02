import path from "node:path";
import { app } from "electron";
import Database from "better-sqlite3";
import { runMigrations } from "./db/migrate";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = path.join(app.getPath("userData"), "assistant.db");
  db = new Database(dbPath);
  runMigrations(db);
  db.pragma("journal_mode = WAL");
  return db;
}
