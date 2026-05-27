import type Database from "better-sqlite3";

export const migration = {
  up: (db: Database.Database): void => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS connected_accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        accountLabel TEXT NOT NULL,
        email TEXT NOT NULL,
        enabledFeatures TEXT NOT NULL,
        syncState TEXT NOT NULL,
        lastSyncAt TEXT,
        syncError TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS external_calendar_events (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        provider TEXT NOT NULL,
        externalId TEXT NOT NULL,
        calendarId TEXT,
        calendarName TEXT,
        title TEXT NOT NULL,
        startAt TEXT NOT NULL,
        endAt TEXT NOT NULL,
        allDay INTEGER NOT NULL DEFAULT 0,
        location TEXT,
        status TEXT,
        attendeesCount INTEGER NOT NULL DEFAULT 0,
        htmlLink TEXT,
        etag TEXT,
        updatedAtProvider TEXT,
        isOnlineMeeting INTEGER NOT NULL DEFAULT 0,
        onlineMeetingProvider TEXT,
        onlineMeetingUrl TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (accountId) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS external_calendar_sync_state (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        calendarId TEXT NOT NULL,
        provider TEXT NOT NULL,
        syncToken TEXT,
        deltaLink TEXT,
        lastFullSyncAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (accountId) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider ON connected_accounts(provider)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_connected_accounts_email ON connected_accounts(email)`);
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_external_calendar_events_account_external ON external_calendar_events(accountId, externalId)`
    );
    db.exec(`CREATE INDEX IF NOT EXISTS idx_external_calendar_events_startAt ON external_calendar_events(startAt)`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_external_calendar_events_accountId ON external_calendar_events(accountId)`
    );
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_external_calendar_sync_state_account_calendar ON external_calendar_sync_state(accountId, calendarId)`
    );
  },
  down: (db: Database.Database): void => {
    db.exec(`DROP INDEX IF EXISTS idx_external_calendar_sync_state_account_calendar`);
    db.exec(`DROP INDEX IF EXISTS idx_external_calendar_events_accountId`);
    db.exec(`DROP INDEX IF EXISTS idx_external_calendar_events_startAt`);
    db.exec(`DROP INDEX IF EXISTS idx_external_calendar_events_account_external`);
    db.exec(`DROP INDEX IF EXISTS idx_connected_accounts_email`);
    db.exec(`DROP INDEX IF EXISTS idx_connected_accounts_provider`);
    db.exec(`DROP TABLE IF EXISTS external_calendar_sync_state`);
    db.exec(`DROP TABLE IF EXISTS external_calendar_events`);
    db.exec(`DROP TABLE IF EXISTS connected_accounts`);
  }
};
