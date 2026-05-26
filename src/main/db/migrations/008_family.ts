import type Database from "better-sqlite3";

export const migration = {
  up: (db: Database.Database): void => {
    // Family members table
    db.exec(`
      CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        preferredContactMethod TEXT DEFAULT 'any',
        notes TEXT,
        isImportant INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Family occasions table (birthdays, name days, anniversaries, etc.)
    db.exec(`
      CREATE TABLE IF NOT EXISTS family_occasions (
        id TEXT PRIMARY KEY,
        memberId TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        recurrence TEXT NOT NULL DEFAULT 'yearly',
        remindDaysBefore INTEGER NOT NULL DEFAULT 7,
        lastAcknowledgedAt TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (memberId) REFERENCES family_members(id) ON DELETE CASCADE
      )
    `);

    // Family obligations table (calls, visits, gifts, etc.)
    db.exec(`
      CREATE TABLE IF NOT EXISTS family_obligations (
        id TEXT PRIMARY KEY,
        memberId TEXT NOT NULL,
        occasionId TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        dueAt TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'normal',
        completedAt TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (memberId) REFERENCES family_members(id) ON DELETE CASCADE,
        FOREIGN KEY (occasionId) REFERENCES family_occasions(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_family_occasions_member ON family_occasions(memberId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_family_occasions_date ON family_occasions(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_family_obligations_member ON family_obligations(memberId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_family_obligations_status ON family_obligations(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_family_obligations_dueAt ON family_obligations(dueAt)`);
  },
  down: (db: Database.Database) => {
    db.exec(`DROP INDEX IF EXISTS idx_family_obligations_dueAt`);
    db.exec(`DROP INDEX IF EXISTS idx_family_obligations_status`);
    db.exec(`DROP INDEX IF EXISTS idx_family_obligations_member`);
    db.exec(`DROP INDEX IF EXISTS idx_family_occasions_date`);
    db.exec(`DROP INDEX IF EXISTS idx_family_occasions_member`);
    db.exec(`DROP TABLE IF EXISTS family_obligations`);
    db.exec(`DROP TABLE IF EXISTS family_occasions`);
    db.exec(`DROP TABLE IF EXISTS family_members`);
  }
};
