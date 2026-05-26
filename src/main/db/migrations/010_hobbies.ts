import type Database from "better-sqlite3";

export const migration = {
  up: (db: Database.Database): void => {
    // Hobbies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS hobbies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Hobby sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS hobby_sessions (
        id TEXT PRIMARY KEY,
        hobbyId TEXT NOT NULL,
        date TEXT NOT NULL,
        durationMinutes INTEGER NOT NULL,
        notes TEXT,
        mood TEXT,
        energy INTEGER,
        progressRating INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (hobbyId) REFERENCES hobbies(id) ON DELETE CASCADE
      )
    `);

    // Hobby projects table
    db.exec(`
      CREATE TABLE IF NOT EXISTS hobby_projects (
        id TEXT PRIMARY KEY,
        hobbyId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        targetDate TEXT,
        completedAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (hobbyId) REFERENCES hobbies(id) ON DELETE CASCADE
      )
    `);

    // Hobby milestones table
    db.exec(`
      CREATE TABLE IF NOT EXISTS hobby_milestones (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        targetDate TEXT,
        completedAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (projectId) REFERENCES hobby_projects(id) ON DELETE CASCADE
      )
    `);

    // Hobby supplies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS hobby_supplies (
        id TEXT PRIMARY KEY,
        hobbyId TEXT NOT NULL,
        projectId TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        cost INTEGER,
        purchaseDate TEXT,
        source TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (hobbyId) REFERENCES hobbies(id) ON DELETE CASCADE,
        FOREIGN KEY (projectId) REFERENCES hobby_projects(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hobby_sessions_hobbyId ON hobby_sessions(hobbyId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hobby_sessions_date ON hobby_sessions(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hobby_projects_hobbyId ON hobby_projects(hobbyId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hobby_projects_status ON hobby_projects(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hobby_milestones_projectId ON hobby_milestones(projectId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hobby_milestones_completedAt ON hobby_milestones(completedAt)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hobby_supplies_hobbyId ON hobby_supplies(hobbyId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hobby_supplies_projectId ON hobby_supplies(projectId)`);
  },
  down: (db: Database.Database) => {
    db.exec(`DROP INDEX IF EXISTS idx_hobby_supplies_projectId`);
    db.exec(`DROP INDEX IF EXISTS idx_hobby_supplies_hobbyId`);
    db.exec(`DROP INDEX IF EXISTS idx_hobby_milestones_completedAt`);
    db.exec(`DROP INDEX IF EXISTS idx_hobby_milestones_projectId`);
    db.exec(`DROP INDEX IF EXISTS idx_hobby_projects_status`);
    db.exec(`DROP INDEX IF EXISTS idx_hobby_projects_hobbyId`);
    db.exec(`DROP INDEX IF EXISTS idx_hobby_sessions_date`);
    db.exec(`DROP INDEX IF EXISTS idx_hobby_sessions_hobbyId`);
    db.exec(`DROP TABLE IF EXISTS hobby_supplies`);
    db.exec(`DROP TABLE IF EXISTS hobby_milestones`);
    db.exec(`DROP TABLE IF EXISTS hobby_projects`);
    db.exec(`DROP TABLE IF EXISTS hobby_sessions`);
    db.exec(`DROP TABLE IF EXISTS hobbies`);
  }
};
