import type { BackupModule, BackupPayload } from "../types";

export const connectedCalendarModule: BackupModule = {
  id: "connectedCalendar",
  payloadKeys: ["connected_accounts", "external_calendar_events", "external_calendar_sync_state"],

  exportData(db) {
    const connected_accounts = db.prepare("SELECT * FROM connected_accounts").all() as BackupPayload["connected_accounts"];
    const external_calendar_events = db
      .prepare("SELECT * FROM external_calendar_events")
      .all() as BackupPayload["external_calendar_events"];
    const external_calendar_sync_state = db
      .prepare("SELECT * FROM external_calendar_sync_state")
      .all() as BackupPayload["external_calendar_sync_state"];
    return { connected_accounts, external_calendar_events, external_calendar_sync_state };
  },

  ensureDefaults(payload) {
    if (!payload.connected_accounts) payload.connected_accounts = [];
    if (!payload.external_calendar_events) payload.external_calendar_events = [];
    if (!payload.external_calendar_sync_state) payload.external_calendar_sync_state = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM external_calendar_events").run();
    db.prepare("DELETE FROM external_calendar_sync_state").run();
    db.prepare("DELETE FROM connected_accounts").run();
  },

  importData(db, payload) {
    const connectedAccountStmt = db.prepare(
      "INSERT INTO connected_accounts (id, provider, accountLabel, email, enabledFeatures, syncState, lastSyncAt, syncError, createdAt, updatedAt) VALUES (@id, @provider, @accountLabel, @email, @enabledFeatures, @syncState, @lastSyncAt, @syncError, @createdAt, @updatedAt)"
    );
    for (const row of payload.connected_accounts || []) {
      connectedAccountStmt.run(row);
    }

    const externalCalendarEventStmt = db.prepare(
      `INSERT INTO external_calendar_events (
        id, accountId, provider, externalId, calendarId, calendarName, title, startAt, endAt, allDay,
        location, status, attendeesCount, htmlLink, etag, updatedAtProvider, isOnlineMeeting, onlineMeetingProvider,
        onlineMeetingUrl, createdAt, updatedAt
      ) VALUES (
        @id, @accountId, @provider, @externalId, @calendarId, @calendarName, @title, @startAt, @endAt, @allDay,
        @location, @status, @attendeesCount, @htmlLink, @etag, @updatedAtProvider, @isOnlineMeeting, @onlineMeetingProvider,
        @onlineMeetingUrl, @createdAt, @updatedAt
      )`
    );
    for (const row of payload.external_calendar_events || []) {
      externalCalendarEventStmt.run({
        ...row,
        isOnlineMeeting: row.isOnlineMeeting ?? 0,
        onlineMeetingProvider: row.onlineMeetingProvider ?? null,
        onlineMeetingUrl: row.onlineMeetingUrl ?? null
      });
    }

    const externalCalendarSyncStateStmt = db.prepare(
      `INSERT INTO external_calendar_sync_state (
        id, accountId, calendarId, provider, syncToken, deltaLink, lastFullSyncAt, createdAt, updatedAt
      ) VALUES (
        @id, @accountId, @calendarId, @provider, @syncToken, @deltaLink, @lastFullSyncAt, @createdAt, @updatedAt
      )`
    );
    for (const row of payload.external_calendar_sync_state || []) {
      externalCalendarSyncStateStmt.run(row);
    }

    return {
      connected_accounts: payload.connected_accounts?.length ?? 0,
      external_calendar_events: payload.external_calendar_events?.length ?? 0,
      external_calendar_sync_state: payload.external_calendar_sync_state?.length ?? 0
    };
  },

  previewSection(payload) {
    return {
      valid: true,
      counts: {
        connected_accounts: payload.connected_accounts?.length ?? 0,
        external_calendar_events: payload.external_calendar_events?.length ?? 0,
        external_calendar_sync_state: payload.external_calendar_sync_state?.length ?? 0
      }
    };
  }
};
