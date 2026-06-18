import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp"),
    getVersion: vi.fn(() => "3.6.0")
  }
}));

vi.mock("../security/policy", () => ({
  isCorporateMode: vi.fn(() => false)
}));

vi.mock("./secureSecrets", () => ({
  encryptSecret: vi.fn((data: string) => `encrypted:${data}`),
  decryptSecret: vi.fn((encrypted: string) => encrypted.replace("encrypted:", "")),
  SecureStorageUnavailableError: class extends Error {
    constructor() {
      super("Secure storage unavailable");
      this.name = "SecureStorageUnavailableError";
    }
  },
  isEncrypted: vi.fn(() => false)
}));

vi.mock("./connectedCalendarSecrets", () => ({
  clearConnectedCalendarTokens: vi.fn()
}));

import {
  createConnectedCalendarAccount,
  disconnectConnectedCalendarAccount,
  getConnectedCalendarAccountsSummary,
  handleGoogleSyncTokenGone,
  listConnectedCalendarAccounts,
  listExternalCalendarEvents,
  listExternalCalendarSyncStateByAccount,
  setConnectedCalendarAccountSyncState,
  upsertExternalCalendarEvent,
  upsertExternalCalendarSyncState
} from "./connectedCalendar";
import { exportBackup, importBackup, resetAllData } from "./backup";
import { clearConnectedCalendarTokens } from "./connectedCalendarSecrets";

describe("connectedCalendar service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  it("creates and lists connected accounts", () => {
    createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"]),
      syncState: "synced"
    });

    const accounts = listConnectedCalendarAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.provider).toBe("google");
  });

  it("disconnect cascades cached rows and clears tokens", () => {
    const account = createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"]),
      syncState: "synced"
    });

    upsertExternalCalendarEvent({
      accountId: account.id,
      provider: "google",
      externalId: "google-event-1",
      calendarId: "primary",
      calendarName: "Primary",
      title: "Standup",
      startAt: "2026-06-01T10:00:00Z",
      endAt: "2026-06-01T10:30:00Z",
      allDay: false
    });
    upsertExternalCalendarSyncState({
      accountId: account.id,
      calendarId: "primary",
      provider: "google",
      syncToken: "sync-1"
    });

    disconnectConnectedCalendarAccount(account.id);

    const eventsCount = testDb.prepare("SELECT COUNT(*) as c FROM external_calendar_events").get() as { c: number };
    const syncCount = testDb.prepare("SELECT COUNT(*) as c FROM external_calendar_sync_state").get() as { c: number };
    expect(eventsCount.c).toBe(0);
    expect(syncCount.c).toBe(0);
    expect(clearConnectedCalendarTokens).toHaveBeenCalledWith(account.id);
  });

  it("upserts external events by accountId and externalId", () => {
    const account = createConnectedCalendarAccount({
      provider: "microsoft",
      accountLabel: "test@contoso.com",
      email: "test@contoso.com",
      enabledFeatures: JSON.stringify(["calendar"])
    });

    const first = upsertExternalCalendarEvent({
      accountId: account.id,
      provider: "microsoft",
      externalId: "event-1",
      title: "Design review",
      startAt: "2026-06-05T09:00:00Z",
      endAt: "2026-06-05T10:00:00Z",
      allDay: false,
      attendeesCount: 2
    });

    const second = upsertExternalCalendarEvent({
      accountId: account.id,
      provider: "microsoft",
      externalId: "event-1",
      title: "Design review updated",
      startAt: "2026-06-05T09:00:00Z",
      endAt: "2026-06-05T10:30:00Z",
      allDay: false,
      attendeesCount: 3
    });

    expect(second.id).toBe(first.id);
    const rows = testDb.prepare("SELECT COUNT(*) as c FROM external_calendar_events").get() as { c: number };
    expect(rows.c).toBe(1);
  });

  it("handles Google 410 cleanup for account calendar cache", () => {
    const account = createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"])
    });

    upsertExternalCalendarEvent({
      accountId: account.id,
      provider: "google",
      externalId: "event-1",
      calendarId: "primary",
      title: "Old event",
      startAt: "2026-06-07T08:00:00Z",
      endAt: "2026-06-07T09:00:00Z",
      allDay: false
    });
    upsertExternalCalendarSyncState({
      accountId: account.id,
      calendarId: "primary",
      provider: "google",
      syncToken: "stale-token"
    });

    handleGoogleSyncTokenGone(account.id, "primary");

    const events = listExternalCalendarEvents({
      startAt: "2026-06-01T00:00:00Z",
      endAt: "2026-06-30T23:59:59Z",
      accountId: account.id
    });
    const syncState = listExternalCalendarSyncStateByAccount(account.id);
    expect(events).toHaveLength(0);
    expect(syncState).toHaveLength(0);
  });

  it("preserves lastSyncAt when sync state moves to error", () => {
    const account = createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"]),
      syncState: "synced",
      lastSyncAt: "2026-05-01T12:00:00Z"
    });
    const errored = setConnectedCalendarAccountSyncState(account.id, "error", {
      syncError: "401",
      lastSyncAt: account.lastSyncAt
    });
    expect(errored.lastSyncAt).toBe("2026-05-01T12:00:00Z");
  });

  it("exports, imports, and resets connected calendar tables", () => {
    const account = createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"])
    });
    upsertExternalCalendarEvent({
      accountId: account.id,
      provider: "google",
      externalId: "event-1",
      title: "Standup",
      startAt: "2026-06-01T10:00:00Z",
      endAt: "2026-06-01T10:30:00Z",
      allDay: false
    });
    upsertExternalCalendarSyncState({
      accountId: account.id,
      calendarId: "primary",
      provider: "google",
      syncToken: "token-1"
    });

    const exported = exportBackup();
    expect(exported.connected_accounts).toHaveLength(1);
    expect(exported.external_calendar_events).toHaveLength(1);
    expect(exported.external_calendar_sync_state).toHaveLength(1);

    resetAllData();
    const afterResetAccounts = testDb.prepare("SELECT COUNT(*) as c FROM connected_accounts").get() as { c: number };
    expect(afterResetAccounts.c).toBe(0);

    importBackup(exported);
    const restored = testDb.prepare("SELECT COUNT(*) as c FROM connected_accounts").get() as { c: number };
    const restoredEvents = testDb.prepare("SELECT COUNT(*) as c FROM external_calendar_events").get() as { c: number };
    const restoredSync = testDb.prepare("SELECT COUNT(*) as c FROM external_calendar_sync_state").get() as { c: number };
    expect(restored.c).toBe(1);
    expect(restoredEvents.c).toBe(1);
    expect(restoredSync.c).toBe(1);
  });

  it("returns connected account summary counts", () => {
    createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "a@gmail.com",
      email: "a@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"]),
      syncState: "synced"
    });
    createConnectedCalendarAccount({
      provider: "microsoft",
      accountLabel: "b@contoso.com",
      email: "b@contoso.com",
      enabledFeatures: JSON.stringify(["calendar"]),
      syncState: "error",
      syncError: "401"
    });

    const summary = getConnectedCalendarAccountsSummary();
    expect(summary.total).toBe(2);
    expect(summary.synced).toBe(1);
    expect(summary.error).toBe(1);
  });
});
