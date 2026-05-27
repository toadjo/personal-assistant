import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

vi.mock("../security/policy", () => ({
  getSecurityPolicy: vi.fn(() => ({
    mode: "personal",
    allowConnectedCalendar: true,
    allowGoogleCalendar: true,
    allowMicrosoftCalendar: true,
    allowedHosts: []
  })),
  isExternalUrlsAllowed: vi.fn(() => true),
  isConnectedCalendarAllowed: vi.fn(() => true),
  isGoogleCalendarAllowed: vi.fn(() => true),
  isMicrosoftCalendarAllowed: vi.fn(() => true),
  isHostAllowed: vi.fn(() => true)
}));

vi.mock("./secureSecrets", () => ({
  encryptSecret: vi.fn((value: string) => `enc:${value}`),
  decryptSecret: vi.fn((value: string) => value.replace(/^enc:/, "")),
  isEncrypted: vi.fn((value: string) => value.startsWith("enc:")),
  SecureStorageUnavailableError: class extends Error {
    constructor() {
      super("Secure storage unavailable");
      this.name = "SecureStorageUnavailableError";
    }
  }
}));

vi.mock("./connectedCalendarSecrets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./connectedCalendarSecrets")>();
  return {
    ...actual,
    getConnectedCalendarTokens: vi.fn(),
    clearConnectedCalendarTokens: vi.fn()
  };
});

const getAdapterMock = vi.fn();

vi.mock("./connectedCalendar/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./connectedCalendar/providers")>();
  return {
    ...actual,
    getConnectedCalendarProviderAdapter: (...args: unknown[]) => getAdapterMock(...args)
  };
});

import * as policy from "../security/policy";
import {
  createConnectedCalendarAccount,
  disconnectConnectedCalendarAccount,
  getConnectedCalendarAccountById,
  setConnectedCalendarAccountSyncState,
  upsertExternalCalendarEvent,
  upsertExternalCalendarSyncState
} from "./connectedCalendar";
import { classifyMicrosoftCalendarDisplaySource } from "../../shared/connectedCalendarDisplay";
import { mapGoogleCalendarEvent, mapMicrosoftCalendarEvent } from "./connectedCalendar/providers";
import { createGoogleCalendarAdapter } from "./connectedCalendar/providers/googleAdapter";
import { createMicrosoftCalendarAdapter } from "./connectedCalendar/providers/microsoftAdapter";
import { getConnectedCalendarTokens, saveConnectedCalendarTokens } from "./connectedCalendarSecrets";
import { validateOAuthCallbackState } from "./connectedCalendarOAuth";
import { syncConnectedCalendarAccount } from "./connectedCalendarSync";
import { getSetting } from "./settingsRepository";
import { OutboundIntegrationBlockedError } from "../security/outboundGuard";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("connected calendar providers", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "google-test-client";
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "google-test-secret";
    process.env.MICROSOFT_CALENDAR_CLIENT_ID = "microsoft-test-client";
    vi.mocked(policy.isConnectedCalendarAllowed).mockReturnValue(true);
    vi.mocked(policy.isGoogleCalendarAllowed).mockReturnValue(true);
    vi.mocked(policy.isMicrosoftCalendarAllowed).mockReturnValue(true);
    getAdapterMock.mockReset();
  });

  afterEach(() => {
    testDb.close();
    vi.clearAllMocks();
  });

  it("builds Google auth URL with PKCE, state, redirect URI, and calendar scope", async () => {
    const adapter = createGoogleCalendarAdapter();
    const auth = await adapter.createAuthRequest("http://127.0.0.1:4321/callback");
    const url = new URL(auth.authUrl);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("google-test-client");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:4321/callback");
    expect(url.searchParams.get("state")).toBe(auth.state);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("scope")).toContain("calendar.events.readonly");
    expect(url.searchParams.get("scope")).toContain("userinfo.email");
  });

  it("builds Microsoft auth URL with PKCE, state, redirect URI, and calendar scope", async () => {
    const adapter = createMicrosoftCalendarAdapter();
    const auth = await adapter.createAuthRequest("http://127.0.0.1:4321/callback");
    const url = new URL(auth.authUrl);
    expect(url.hostname).toBe("login.microsoftonline.com");
    expect(url.searchParams.get("client_id")).toBe("microsoft-test-client");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:4321/callback");
    expect(url.searchParams.get("state")).toBe(auth.state);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toContain("Calendars.ReadBasic");
  });

  it("maps Google timed and all-day events", () => {
    const timed = mapGoogleCalendarEvent({
      id: "g-1",
      summary: "Standup",
      start: { dateTime: "2026-06-01T10:00:00Z" },
      end: { dateTime: "2026-06-01T10:30:00Z" },
      updated: "2026-06-01T09:00:00Z",
      etag: "\"etag-1\""
    });
    const allDay = mapGoogleCalendarEvent({
      id: "g-2",
      summary: "Holiday",
      start: { date: "2026-06-02" },
      end: { date: "2026-06-03" }
    });
    expect(timed?.allDay).toBe(false);
    expect(timed?.title).toBe("Standup");
    expect(allDay?.allDay).toBe(true);
    expect(allDay?.startAt).toContain("2026-06-02");
  });

  it("maps Microsoft timed and all-day events", () => {
    const timed = mapMicrosoftCalendarEvent({
      id: "m-1",
      subject: "Review",
      start: { dateTime: "2026-06-01T10:00:00Z", timeZone: "UTC" },
      end: { dateTime: "2026-06-01T11:00:00Z", timeZone: "UTC" },
      isAllDay: false,
      location: { displayName: "Room A" }
    });
    const allDay = mapMicrosoftCalendarEvent({
      id: "m-2",
      subject: "Offsite",
      start: { dateTime: "2026-06-03", timeZone: "UTC" },
      end: { dateTime: "2026-06-04", timeZone: "UTC" },
      isAllDay: true
    });
    expect(timed?.title).toBe("Review");
    expect(timed?.location).toBe("Room A");
    expect(allDay?.allDay).toBe(true);
    expect(timed?.isOnlineMeeting).toBe(false);
    expect(timed?.onlineMeetingProvider).toBeNull();
    expect(timed?.onlineMeetingUrl).toBeNull();
  });

  it("maps Microsoft Teams meeting online meeting fields", () => {
    const teams = mapMicrosoftCalendarEvent({
      id: "m-teams",
      subject: "Sprint planning",
      start: { dateTime: "2026-06-01T10:00:00Z", timeZone: "UTC" },
      end: { dateTime: "2026-06-01T11:00:00Z", timeZone: "UTC" },
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/abc" },
      attendees: [{}, {}]
    });
    expect(teams?.isOnlineMeeting).toBe(true);
    expect(teams?.onlineMeetingProvider).toBe("teamsForBusiness");
    expect(teams?.onlineMeetingUrl).toBe("https://teams.microsoft.com/l/meetup-join/abc");
    expect(teams?.attendeesCount).toBe(2);
    expect(
      classifyMicrosoftCalendarDisplaySource({
        isOnlineMeeting: teams?.isOnlineMeeting,
        onlineMeetingProvider: teams?.onlineMeetingProvider,
        onlineMeetingUrl: teams?.onlineMeetingUrl
      })
    ).toBe("teams");
  });

  it("stores online meeting fields when upserting external events", () => {
    const account = createConnectedCalendarAccount({
      provider: "microsoft",
      accountLabel: "user@contoso.com",
      email: "user@contoso.com",
      enabledFeatures: JSON.stringify(["calendar"])
    });
    const row = upsertExternalCalendarEvent({
      accountId: account.id,
      provider: "microsoft",
      externalId: "evt-teams",
      title: "Standup",
      startAt: "2026-06-01T10:00:00Z",
      endAt: "2026-06-01T10:30:00Z",
      allDay: false,
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      onlineMeetingUrl: "https://teams.microsoft.com/l/meetup-join/xyz"
    });
    const stored = testDb
      .prepare("SELECT isOnlineMeeting, onlineMeetingProvider, onlineMeetingUrl FROM external_calendar_events WHERE id = ?")
      .get(row.id) as {
      isOnlineMeeting: number;
      onlineMeetingProvider: string | null;
      onlineMeetingUrl: string | null;
    };
    expect(stored.isOnlineMeeting).toBe(1);
    expect(stored.onlineMeetingProvider).toBe("teamsForBusiness");
    expect(stored.onlineMeetingUrl).toContain("teams.microsoft.com");
  });

  it("rejects mismatched OAuth state", () => {
    expect(() => validateOAuthCallbackState("expected-state", "other-state")).toThrow(/OAuth state mismatch/);
  });

  it("stores encrypted token payload on token exchange", async () => {
    const account = createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"])
    });
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) {
        const body = String(init?.body ?? "");
        expect(body).toContain("client_secret=google-test-secret");
        return jsonResponse({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          token_type: "Bearer"
        });
      }
      return jsonResponse({ email: "test@gmail.com", name: "Test User" });
    }) as typeof fetch;
    const adapter = createGoogleCalendarAdapter(fetchMock);
    const tokens = await adapter.exchangeCode({
      code: "auth-code",
      codeVerifier: "verifier",
      redirectUri: "http://127.0.0.1/callback"
    });
    await saveConnectedCalendarTokens(account.id, tokens);
    const stored = getSetting(`connectedCalendar.${account.id}.tokens`);
    expect(stored?.startsWith("enc:")).toBe(true);
  });

  it("includes Google token exchange error details", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          error: "invalid_client",
          error_description: "The OAuth client was not found."
        },
        400
      )
    ) as typeof fetch;
    const adapter = createGoogleCalendarAdapter(fetchMock);

    await expect(
      adapter.exchangeCode({
        code: "auth-code",
        codeVerifier: "verifier",
        redirectUri: "http://127.0.0.1/callback"
      })
    ).rejects.toThrow(
      /invalid_client: The OAuth client was not found\. Use a Google OAuth Desktop app client ID/
    );
  });

  it("handles Google 410 by clearing cache and full-resyncing", async () => {
    const account = createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"]),
      syncState: "synced",
      lastSyncAt: "2026-05-01T12:00:00Z"
    });
    upsertExternalCalendarEvent({
      accountId: account.id,
      provider: "google",
      externalId: "event-1",
      calendarId: "primary",
      title: "Old",
      startAt: "2026-06-01T10:00:00Z",
      endAt: "2026-06-01T11:00:00Z",
      allDay: false
    });
    upsertExternalCalendarSyncState({
      accountId: account.id,
      calendarId: "primary",
      provider: "google",
      syncToken: "stale-token"
    });

    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return new Response("", { status: 410 });
      }
      return jsonResponse({
        items: [
          {
            id: "event-2",
            summary: "Fresh",
            start: { dateTime: "2026-06-02T10:00:00Z" },
            end: { dateTime: "2026-06-02T11:00:00Z" }
          }
        ],
        nextSyncToken: "new-token"
      });
    });

    vi.mocked(getConnectedCalendarTokens).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });
    getAdapterMock.mockReturnValue(createGoogleCalendarAdapter(fetchMock));

    await syncConnectedCalendarAccount(account.id);

    const events = testDb.prepare("SELECT externalId FROM external_calendar_events WHERE accountId = ?").all(account.id) as
      Array<{ externalId: string }>;
    expect(events.map((row) => row.externalId)).toEqual(["event-2"]);
    const syncState = testDb
      .prepare("SELECT syncToken FROM external_calendar_sync_state WHERE accountId = ? AND calendarId = ?")
      .get(account.id, "primary") as { syncToken: string };
    expect(syncState.syncToken).toBe("new-token");
  });

  it("keeps previous lastSyncAt when sync fails", async () => {
    createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"]),
      syncState: "synced",
      lastSyncAt: "2026-05-01T12:00:00Z"
    });
    const account = testDb.prepare("SELECT id FROM connected_accounts LIMIT 1").get() as { id: string };

    vi.mocked(getConnectedCalendarTokens).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });
    getAdapterMock.mockReturnValue(createGoogleCalendarAdapter(vi.fn(async () => new Response("", { status: 500 }))));

    const result = await syncConnectedCalendarAccount(account.id);
    expect(result.syncState).toBe("error");
    expect(result.lastSyncAt).toBe("2026-05-01T12:00:00Z");
  });

  it("disconnect removes tokens, events, and sync state", () => {
    const account = createConnectedCalendarAccount({
      provider: "microsoft",
      accountLabel: "test@contoso.com",
      email: "test@contoso.com",
      enabledFeatures: JSON.stringify(["calendar"])
    });
    upsertExternalCalendarEvent({
      accountId: account.id,
      provider: "microsoft",
      externalId: "event-1",
      title: "Meeting",
      startAt: "2026-06-01T10:00:00Z",
      endAt: "2026-06-01T11:00:00Z",
      allDay: false
    });
    upsertExternalCalendarSyncState({
      accountId: account.id,
      calendarId: "primary",
      provider: "microsoft"
    });

    disconnectConnectedCalendarAccount(account.id);
    expect(getConnectedCalendarAccountById(account.id)).toBeNull();
    const events = testDb.prepare("SELECT COUNT(*) as c FROM external_calendar_events").get() as { c: number };
    const sync = testDb.prepare("SELECT COUNT(*) as c FROM external_calendar_sync_state").get() as { c: number };
    expect(events.c).toBe(0);
    expect(sync.c).toBe(0);
  });

  it("blocks provider HTTP when connected calendar policy is disabled", async () => {
    vi.mocked(policy.isConnectedCalendarAllowed).mockReturnValue(false);
    const adapter = createGoogleCalendarAdapter();
    await expect(
      adapter.exchangeCode({ code: "x", codeVerifier: "y", redirectUri: "http://127.0.0.1/callback" })
    ).rejects.toBeInstanceOf(OutboundIntegrationBlockedError);
  });

  it("rejects invalid enabledFeatures JSON on account create", () => {
    expect(() =>
      createConnectedCalendarAccount({
        provider: "google",
        accountLabel: "test@gmail.com",
        email: "test@gmail.com",
        enabledFeatures: "not-json"
      })
    ).toThrow(/enabledFeatures/);
  });

  it("does not clear lastSyncAt when entering syncing state", () => {
    const account = createConnectedCalendarAccount({
      provider: "google",
      accountLabel: "test@gmail.com",
      email: "test@gmail.com",
      enabledFeatures: JSON.stringify(["calendar"]),
      syncState: "synced",
      lastSyncAt: "2026-05-01T12:00:00Z"
    });
    const syncing = setConnectedCalendarAccountSyncState(account.id, "syncing");
    expect(syncing.lastSyncAt).toBe("2026-05-01T12:00:00Z");
  });
});
