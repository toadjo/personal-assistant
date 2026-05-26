import type Database from "better-sqlite3";

export const migration = {
  up: (db: Database.Database): void => {
    // Health appointments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS health_appointments (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        provider TEXT,
        location TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Health medications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS health_medications (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        route TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        startDate TEXT NOT NULL,
        endDate TEXT,
        prescriber TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Health symptoms table
    db.exec(`
      CREATE TABLE IF NOT EXISTS health_symptoms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        severity TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Health measurements table
    db.exec(`
      CREATE TABLE IF NOT EXISTS health_measurements (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        unit TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Health obligations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS health_obligations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        dueAt TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'normal',
        completedAt TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_health_appointments_date ON health_appointments(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_health_appointments_status ON health_appointments(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_health_medications_status ON health_medications(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_health_symptoms_severity ON health_symptoms(severity)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_health_measurements_type ON health_measurements(type)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_health_measurements_date ON health_measurements(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_health_obligations_status ON health_obligations(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_health_obligations_dueAt ON health_obligations(dueAt)`);
  },
  down: (db: Database.Database) => {
    db.exec(`DROP INDEX IF EXISTS idx_health_obligations_dueAt`);
    db.exec(`DROP INDEX IF EXISTS idx_health_obligations_status`);
    db.exec(`DROP INDEX IF EXISTS idx_health_measurements_date`);
    db.exec(`DROP INDEX IF EXISTS idx_health_measurements_type`);
    db.exec(`DROP INDEX IF EXISTS idx_health_symptoms_severity`);
    db.exec(`DROP INDEX IF EXISTS idx_health_medications_status`);
    db.exec(`DROP INDEX IF EXISTS idx_health_appointments_status`);
    db.exec(`DROP INDEX IF EXISTS idx_health_appointments_date`);
    db.exec(`DROP TABLE IF EXISTS health_obligations`);
    db.exec(`DROP TABLE IF EXISTS health_measurements`);
    db.exec(`DROP TABLE IF EXISTS health_symptoms`);
    db.exec(`DROP TABLE IF EXISTS health_medications`);
    db.exec(`DROP TABLE IF EXISTS health_appointments`);
  }
};