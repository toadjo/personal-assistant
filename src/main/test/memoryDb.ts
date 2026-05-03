import Database from "better-sqlite3";
import { runMigrations } from "../db/migrate";

/**
 * In-memory SQLite with the same migrations as production (for main-process service tests).
 * `npm test` / `npm run test:watch` use `scripts/run-vitest-for-node.mjs`, which rebuilds `better-sqlite3`
 * for Node (Vitest), then restores Electron’s native modules afterward so `npm run dev` still opens the DB.
 */
export function createMemoryDatabase(): Database.Database {
  const database = new Database(":memory:");
  runMigrations(database);
  return database;
}
