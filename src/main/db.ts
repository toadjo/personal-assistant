import path from "node:path";
import { app } from "electron";
import Database from "better-sqlite3";
import { runMigrations } from "./db/migrate";

let db: Database.Database | null = null;

const OPEN_RETRIES = 4;
const OPEN_RETRY_BASE_MS = 40;

function spinWait(ms: number): void {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    /* synchronous backoff for rare SQLITE_BUSY on open */
  }
}

function isRetryableSqliteError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return lower.includes("sqlite_busy") || lower.includes("database is locked") || lower.includes("sqlite_locked");
}

function describeDbOpenFailure(dbPath: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("enospc") || lower.includes("disk full") || lower.includes("quota")) {
    return `Could not open the database at ${dbPath}: disk may be full or quota exceeded. (${msg})`;
  }
  if (lower.includes("eacces") || lower.includes("permission") || lower.includes("readonly")) {
    return `Could not open the database at ${dbPath}: permission denied or the file is read-only. (${msg})`;
  }
  if (lower.includes("cantopen") || lower.includes("unable to open database file")) {
    return `Could not open the database at ${dbPath}: the file could not be opened (another process may hold a lock, or the path is invalid). (${msg})`;
  }
  return `Could not open the database at ${dbPath}: ${msg}`;
}

function describeDbSetupFailure(dbPath: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return `Database opened at ${dbPath} but setup failed (migrations or pragmas): ${msg}`;
}

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = path.join(app.getPath("userData"), "assistant.db");
  let lastErr: unknown;
  for (let attempt = 1; attempt <= OPEN_RETRIES; attempt++) {
    let instance: Database.Database | null = null;
    try {
      instance = new Database(dbPath);
    } catch (err) {
      lastErr = err;
      if (attempt < OPEN_RETRIES && isRetryableSqliteError(err)) {
        spinWait(OPEN_RETRY_BASE_MS * attempt);
        continue;
      }
      throw new Error(describeDbOpenFailure(dbPath, err), { cause: err });
    }
    try {
      instance.pragma("busy_timeout = 8000");
      runMigrations(instance);
      instance.pragma("journal_mode = WAL");
      db = instance;
      return instance;
    } catch (err) {
      lastErr = err;
      try {
        instance.close();
      } catch {
        /* ignore close errors */
      }
      instance = null;
      if (attempt < OPEN_RETRIES && isRetryableSqliteError(err)) {
        spinWait(OPEN_RETRY_BASE_MS * attempt);
        continue;
      }
      throw new Error(describeDbSetupFailure(dbPath, err), { cause: err });
    }
  }
  throw new Error(`Database initialization failed for ${dbPath}.`, { cause: lastErr });
}
