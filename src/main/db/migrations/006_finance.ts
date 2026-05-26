import type Database from "better-sqlite3";

export function up006Finance(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS finance_bills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      dueAt TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none',
      category TEXT NOT NULL DEFAULT 'other',
      status TEXT NOT NULL DEFAULT 'unpaid',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastPaidAt TEXT
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS finance_expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Create indexes for common queries
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_finance_bills_dueAt ON finance_bills(dueAt);
    CREATE INDEX IF NOT EXISTS idx_finance_bills_status ON finance_bills(status);
    CREATE INDEX IF NOT EXISTS idx_finance_bills_category ON finance_bills(category);
    CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON finance_expenses(date);
    CREATE INDEX IF NOT EXISTS idx_finance_expenses_category ON finance_expenses(category);
  `);
}
