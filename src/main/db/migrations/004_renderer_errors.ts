import type Database from "better-sqlite3";

export function up004RendererErrors(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS renderer_errors (
      id TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      componentStack TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_renderer_errors_createdAt ON renderer_errors (createdAt DESC);
  `);
}
