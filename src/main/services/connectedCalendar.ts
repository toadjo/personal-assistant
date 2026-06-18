import type {
  ConnectedCalendarAccount,
  ConnectedCalendarProvider,
  ConnectedCalendarSyncStateValue,
  ExternalCalendarEvent,
  ExternalCalendarSyncState
} from "../../shared/types";
import { getDb } from "../db";
import { parseEnabledFeatures } from "./connectedCalendar/features";
import { clearConnectedCalendarTokens } from "./connectedCalendarSecrets";

type CreateConnectedCalendarAccountPayload = {
  provider: ConnectedCalendarProvider;
  accountLabel: string;
  email: string;
  enabledFeatures: string;
  syncState?: ConnectedCalendarSyncStateValue;
  lastSyncAt?: string | null;
  syncError?: string | null;
};

type UpdateConnectedCalendarAccountPayload = {
  id: string;
  accountLabel?: string;
  email?: string;
  enabledFeatures?: string;
  syncState?: ConnectedCalendarSyncStateValue;
  lastSyncAt?: string | null;
  syncError?: string | null;
};

type ListExternalCalendarEventsPayload = {
  startAt: string;
  endAt: string;
  provider?: ConnectedCalendarProvider;
  accountId?: string;
};

type UpsertExternalCalendarEventPayload = {
  accountId: string;
  provider: ConnectedCalendarProvider;
  externalId: string;
  calendarId?: string | null;
  calendarName?: string | null;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location?: string | null;
  status?: string | null;
  attendeesCount?: number;
  htmlLink?: string | null;
  etag?: string | null;
  updatedAtProvider?: string | null;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string | null;
  onlineMeetingUrl?: string | null;
};

type UpsertExternalCalendarSyncStatePayload = {
  accountId: string;
  calendarId: string;
  provider: ConnectedCalendarProvider;
  syncToken?: string | null;
  deltaLink?: string | null;
  lastFullSyncAt?: string | null;
};

type ConnectedCalendarAccountsSummary = {
  total: number;
  synced: number;
  error: number;
};

export function listConnectedCalendarAccounts(): ConnectedCalendarAccount[] {
  return getDb()
    .prepare("SELECT * FROM connected_accounts ORDER BY createdAt DESC")
    .all() as ConnectedCalendarAccount[];
}

export function getConnectedCalendarAccountById(id: string): ConnectedCalendarAccount | null {
  const row = getDb().prepare("SELECT * FROM connected_accounts WHERE id = ?").get(id) as ConnectedCalendarAccount | undefined;
  return row ?? null;
}

export function findConnectedCalendarAccountByProviderEmail(
  provider: ConnectedCalendarProvider,
  email: string
): ConnectedCalendarAccount | null {
  const row = getDb()
    .prepare("SELECT * FROM connected_accounts WHERE provider = ? AND email = ? LIMIT 1")
    .get(provider, email) as ConnectedCalendarAccount | undefined;
  return row ?? null;
}

export function createConnectedCalendarAccount(payload: CreateConnectedCalendarAccountPayload): ConnectedCalendarAccount {
  parseEnabledFeatures(payload.enabledFeatures);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO connected_accounts (
        id, provider, accountLabel, email, enabledFeatures, syncState, lastSyncAt, syncError, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      payload.provider,
      payload.accountLabel,
      payload.email,
      payload.enabledFeatures,
      payload.syncState ?? "disconnected",
      payload.lastSyncAt ?? null,
      payload.syncError ?? null,
      now,
      now
    );
  const created = getConnectedCalendarAccountById(id);
  if (!created) {
    throw new Error("Failed to create connected calendar account.");
  }
  return created;
}

export function updateConnectedCalendarAccount(payload: UpdateConnectedCalendarAccountPayload): ConnectedCalendarAccount {
  const existing = getConnectedCalendarAccountById(payload.id);
  if (!existing) {
    throw new Error(`Connected calendar account not found: ${payload.id}`);
  }
  if (payload.enabledFeatures !== undefined) {
    parseEnabledFeatures(payload.enabledFeatures);
  }
  const updates: string[] = [];
  const params: unknown[] = [];

  if (payload.accountLabel !== undefined) {
    updates.push("accountLabel = ?");
    params.push(payload.accountLabel);
  }
  if (payload.email !== undefined) {
    updates.push("email = ?");
    params.push(payload.email);
  }
  if (payload.enabledFeatures !== undefined) {
    updates.push("enabledFeatures = ?");
    params.push(payload.enabledFeatures);
  }
  if (payload.syncState !== undefined) {
    updates.push("syncState = ?");
    params.push(payload.syncState);
  }
  if (payload.lastSyncAt !== undefined) {
    updates.push("lastSyncAt = ?");
    params.push(payload.lastSyncAt);
  }
  if (payload.syncError !== undefined) {
    updates.push("syncError = ?");
    params.push(payload.syncError);
  }

  updates.push("updatedAt = ?");
  params.push(new Date().toISOString());
  params.push(payload.id);

  getDb()
    .prepare(`UPDATE connected_accounts SET ${updates.join(", ")} WHERE id = ?`)
    .run(...params);

  return getConnectedCalendarAccountById(payload.id)!;
}

export function setConnectedCalendarAccountSyncState(
  accountId: string,
  syncState: ConnectedCalendarSyncStateValue,
  options: { syncError?: string | null; lastSyncAt?: string | null } = {}
): ConnectedCalendarAccount {
  const existing = getConnectedCalendarAccountById(accountId);
  if (!existing) {
    throw new Error(`Connected calendar account not found: ${accountId}`);
  }

  const update: UpdateConnectedCalendarAccountPayload = {
    id: accountId,
    syncState
  };

  if (syncState === "synced") {
    update.lastSyncAt = options.lastSyncAt ?? new Date().toISOString();
    update.syncError = options.syncError ?? null;
  } else {
    if (options.syncError !== undefined) {
      update.syncError = options.syncError;
    } else if (syncState !== "error") {
      update.syncError = null;
    }
    if (options.lastSyncAt !== undefined) {
      update.lastSyncAt = options.lastSyncAt;
    }
  }

  return updateConnectedCalendarAccount(update);
}

export function disconnectConnectedCalendarAccount(accountId: string): void {
  const db = getDb();
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM connected_accounts WHERE id = ?").run(accountId);
  });
  txn();
  clearConnectedCalendarTokens(accountId);
}

export function listExternalCalendarEvents(payload: ListExternalCalendarEventsPayload): ExternalCalendarEvent[] {
  let sql = `
    SELECT * FROM external_calendar_events
    WHERE startAt < ? AND endAt >= ?
  `;
  const params: unknown[] = [payload.endAt, payload.startAt];

  if (payload.provider) {
    sql += " AND provider = ?";
    params.push(payload.provider);
  }
  if (payload.accountId) {
    sql += " AND accountId = ?";
    params.push(payload.accountId);
  }
  sql += " ORDER BY startAt ASC, createdAt ASC";

  return getDb().prepare(sql).all(...params) as ExternalCalendarEvent[];
}

export function upsertExternalCalendarEvent(payload: UpsertExternalCalendarEventPayload): ExternalCalendarEvent {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT id FROM external_calendar_events WHERE accountId = ? AND externalId = ?")
    .get(payload.accountId, payload.externalId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE external_calendar_events
       SET provider = ?, calendarId = ?, calendarName = ?, title = ?, startAt = ?, endAt = ?, allDay = ?,
           location = ?, status = ?, attendeesCount = ?, htmlLink = ?, etag = ?, updatedAtProvider = ?,
           isOnlineMeeting = ?, onlineMeetingProvider = ?, onlineMeetingUrl = ?, updatedAt = ?
       WHERE id = ?`
    ).run(
      payload.provider,
      payload.calendarId ?? null,
      payload.calendarName ?? null,
      payload.title,
      payload.startAt,
      payload.endAt,
      payload.allDay ? 1 : 0,
      payload.location ?? null,
      payload.status ?? null,
      payload.attendeesCount ?? 0,
      payload.htmlLink ?? null,
      payload.etag ?? null,
      payload.updatedAtProvider ?? null,
      payload.isOnlineMeeting ? 1 : 0,
      payload.onlineMeetingProvider ?? null,
      payload.onlineMeetingUrl ?? null,
      now,
      existing.id
    );
    return getExternalCalendarEventById(existing.id)!;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO external_calendar_events (
      id, accountId, provider, externalId, calendarId, calendarName, title, startAt, endAt, allDay,
      location, status, attendeesCount, htmlLink, etag, updatedAtProvider, isOnlineMeeting, onlineMeetingProvider,
      onlineMeetingUrl, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    payload.accountId,
    payload.provider,
    payload.externalId,
    payload.calendarId ?? null,
    payload.calendarName ?? null,
    payload.title,
    payload.startAt,
    payload.endAt,
    payload.allDay ? 1 : 0,
    payload.location ?? null,
    payload.status ?? null,
    payload.attendeesCount ?? 0,
    payload.htmlLink ?? null,
    payload.etag ?? null,
    payload.updatedAtProvider ?? null,
    payload.isOnlineMeeting ? 1 : 0,
    payload.onlineMeetingProvider ?? null,
    payload.onlineMeetingUrl ?? null,
    now,
    now
  );
  return getExternalCalendarEventById(id)!;
}

export function deleteExternalCalendarEventsByAccount(accountId: string, calendarId?: string): number {
  if (calendarId) {
    const result = getDb()
      .prepare("DELETE FROM external_calendar_events WHERE accountId = ? AND calendarId = ?")
      .run(accountId, calendarId);
    return result.changes;
  }
  const result = getDb().prepare("DELETE FROM external_calendar_events WHERE accountId = ?").run(accountId);
  return result.changes;
}

export function upsertExternalCalendarSyncState(payload: UpsertExternalCalendarSyncStatePayload): ExternalCalendarSyncState {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT id FROM external_calendar_sync_state WHERE accountId = ? AND calendarId = ?")
    .get(payload.accountId, payload.calendarId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE external_calendar_sync_state
       SET provider = ?, syncToken = ?, deltaLink = ?, lastFullSyncAt = ?, updatedAt = ?
       WHERE id = ?`
    ).run(
      payload.provider,
      payload.syncToken ?? null,
      payload.deltaLink ?? null,
      payload.lastFullSyncAt ?? null,
      now,
      existing.id
    );
    return getExternalCalendarSyncStateById(existing.id)!;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO external_calendar_sync_state (
      id, accountId, calendarId, provider, syncToken, deltaLink, lastFullSyncAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    payload.accountId,
    payload.calendarId,
    payload.provider,
    payload.syncToken ?? null,
    payload.deltaLink ?? null,
    payload.lastFullSyncAt ?? null,
    now,
    now
  );
  return getExternalCalendarSyncStateById(id)!;
}

export function listExternalCalendarSyncStateByAccount(accountId: string): ExternalCalendarSyncState[] {
  return getDb()
    .prepare("SELECT * FROM external_calendar_sync_state WHERE accountId = ? ORDER BY createdAt DESC")
    .all(accountId) as ExternalCalendarSyncState[];
}

export function clearExternalCalendarSyncState(accountId: string, calendarId?: string): number {
  if (calendarId) {
    const result = getDb()
      .prepare("DELETE FROM external_calendar_sync_state WHERE accountId = ? AND calendarId = ?")
      .run(accountId, calendarId);
    return result.changes;
  }
  const result = getDb().prepare("DELETE FROM external_calendar_sync_state WHERE accountId = ?").run(accountId);
  return result.changes;
}

export function handleGoogleSyncTokenGone(accountId: string, calendarId: string): void {
  const db = getDb();
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM external_calendar_events WHERE accountId = ? AND calendarId = ?").run(accountId, calendarId);
    db.prepare("DELETE FROM external_calendar_sync_state WHERE accountId = ? AND calendarId = ?").run(accountId, calendarId);
  });
  txn();
}

export function getConnectedCalendarAccountsSummary(): ConnectedCalendarAccountsSummary {
  const total = getDb().prepare("SELECT COUNT(*) as count FROM connected_accounts").get() as { count: number };
  const synced = getDb()
    .prepare("SELECT COUNT(*) as count FROM connected_accounts WHERE syncState = 'synced'")
    .get() as { count: number };
  const error = getDb()
    .prepare("SELECT COUNT(*) as count FROM connected_accounts WHERE syncState = 'error'")
    .get() as { count: number };
  return {
    total: total.count,
    synced: synced.count,
    error: error.count
  };
}

function getExternalCalendarEventById(id: string): ExternalCalendarEvent | null {
  const row = getDb().prepare("SELECT * FROM external_calendar_events WHERE id = ?").get(id) as
    | ExternalCalendarEvent
    | undefined;
  return row ?? null;
}

function getExternalCalendarSyncStateById(id: string): ExternalCalendarSyncState | null {
  const row = getDb().prepare("SELECT * FROM external_calendar_sync_state WHERE id = ?").get(id) as
    | ExternalCalendarSyncState
    | undefined;
  return row ?? null;
}
