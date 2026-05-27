import type { ConnectedCalendarTokenSet } from "../../connectedCalendarSecrets";
import {
  assertGoogleCalendarClientIdConfigured,
  getGoogleCalendarClientId,
  getGoogleCalendarClientSecret
} from "../oauthClientConfig";
import { GOOGLE_CALENDAR_SCOPE } from "./config";
import { generateOAuthState, generatePkcePair } from "./pkce";
import { providerFetch } from "./providerHttp";
import type {
  ConnectedCalendarProviderAdapter,
  NormalizedExternalEvent,
  ProviderFetch,
  SyncCursor,
  SyncResult
} from "./types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const SYNC_PAST_DAYS = 90;
const SYNC_FUTURE_DAYS = 365;

type GoogleEventDate = { dateTime?: string; date?: string };
type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  htmlLink?: string;
  updated?: string;
  etag?: string;
  status?: string;
  attendees?: unknown[];
};

export function mapGoogleCalendarEvent(event: GoogleCalendarEvent): NormalizedExternalEvent | null {
  if (!event.id) return null;
  const start = event.start;
  const end = event.end;
  const allDay = Boolean(start?.date && !start?.dateTime);
  const startAt = start?.dateTime ?? start?.date;
  const endAt = end?.dateTime ?? end?.date;
  if (!startAt || !endAt) return null;

  return {
    externalId: event.id,
    calendarId: "primary",
    calendarName: "Primary",
    title: event.summary?.trim() || "(No title)",
    startAt: normalizeGoogleDateTime(startAt, allDay, false),
    endAt: normalizeGoogleDateTime(endAt, allDay, true),
    allDay,
    location: null,
    status: event.status ?? null,
    attendeesCount: Array.isArray(event.attendees) ? event.attendees.length : 0,
    htmlLink: event.htmlLink ?? null,
    etag: event.etag ?? null,
    updatedAtProvider: event.updated ?? null,
    isOnlineMeeting: false,
    onlineMeetingProvider: null,
    onlineMeetingUrl: null
  };
}

function normalizeGoogleDateTime(value: string, allDay: boolean, isEnd: boolean): string {
  if (!allDay) return value;
  if (value.includes("T")) return value;
  return isEnd ? `${value}T00:00:00.000Z` : `${value}T00:00:00.000Z`;
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function createGoogleCalendarAdapter(fetchImpl: ProviderFetch = fetch): ConnectedCalendarProviderAdapter {
  return {
    provider: "google",
    async createAuthRequest(redirectUri: string) {
      assertGoogleCalendarClientIdConfigured();
      const clientId = getGoogleCalendarClientId();
      const { codeVerifier, codeChallenge } = generatePkcePair();
      const state = generateOAuthState();
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: GOOGLE_CALENDAR_SCOPE,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        access_type: "offline",
        prompt: "consent"
      });
      return {
        authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}`,
        state,
        codeVerifier
      };
    },
    async exchangeCode(input) {
      return exchangeGoogleTokens(input, fetchImpl);
    },
    async refreshTokens(tokens) {
      if (!tokens.refreshToken) {
        throw new Error("Google refresh token is unavailable. Reconnect the account.");
      }
      const refreshed = await exchangeGoogleTokens(
        { grantType: "refresh_token", refreshToken: tokens.refreshToken },
        fetchImpl
      );
      return { ...tokens, ...refreshed, refreshToken: refreshed.refreshToken ?? tokens.refreshToken };
    },
    async getAccountProfile(tokens) {
      const response = await providerFetch(
        "google",
        GOOGLE_USERINFO_URL,
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
        fetchImpl
      );
      if (!response.ok) {
        throw new Error(`Google profile request failed (${response.status}): ${await readGoogleErrorMessage(response)}`);
      }
      const body = (await response.json()) as { email?: string; name?: string };
      const email = body.email?.trim();
      if (!email) {
        throw new Error("Google profile did not include an email address.");
      }
      return { email, label: body.name?.trim() || email };
    },
    async syncCalendar(input) {
      return syncGoogleCalendar(input.tokens, input.cursor, fetchImpl);
    }
  };
}

async function exchangeGoogleTokens(
  input:
    | { code: string; codeVerifier: string; redirectUri: string }
    | { grantType: "refresh_token"; refreshToken: string },
  fetchImpl: ProviderFetch
): Promise<ConnectedCalendarTokenSet> {
  assertGoogleCalendarClientIdConfigured();
  const clientId = getGoogleCalendarClientId();
  const clientSecret = getGoogleCalendarClientSecret();
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  if ("code" in input) {
    body.set("grant_type", "authorization_code");
    body.set("code", input.code);
    body.set("redirect_uri", input.redirectUri);
    body.set("code_verifier", input.codeVerifier);
  } else {
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", input.refreshToken);
  }

  const response = await providerFetch(
    "google",
    GOOGLE_TOKEN_URL,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
    fetchImpl
  );
  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}): ${await readGoogleErrorMessage(response)}`);
  }
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!json.access_token) {
    throw new Error("Google token response did not include an access token.");
  }
  const expiryDate =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : undefined;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiryDate,
    scope: json.scope,
    tokenType: json.token_type
  };
}

async function readGoogleErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string | { code?: number; message?: string; status?: string };
      error_description?: string;
    };
    const nestedError = typeof body.error === "object" ? body.error : null;
    const code =
      typeof body.error === "string"
        ? body.error.trim()
        : nestedError?.status?.trim() || (typeof nestedError?.code === "number" ? String(nestedError.code) : "");
    const description = stripTrailingPeriod(body.error_description?.trim() || nestedError?.message?.trim() || "");
    if (description && /api has not been used|disabled/i.test(description)) {
      return `${description}. Enable the Google Calendar API for this Google Cloud project, then reconnect the account.`;
    }
    if (code === "PERMISSION_DENIED" || /insufficient authentication scopes/i.test(description ?? "")) {
      return description
        ? `${code}: ${description}. Reconnect Google Calendar so the app receives the updated calendar scope.`
        : `${code}. Reconnect Google Calendar so the app receives the updated calendar scope.`;
    }
    if (code === "invalid_client") {
      return description
        ? `${code}: ${description}. Use a Google OAuth Desktop app client ID, not a Web application client ID.`
        : `${code}. Use a Google OAuth Desktop app client ID, not a Web application client ID.`;
    }
    if (code === "invalid_grant") {
      return description
        ? `${code}: ${description}. Start Google sign-in again and finish with the same app window.`
        : `${code}. Start Google sign-in again and finish with the same app window.`;
    }
    if (code && description) return `${code}: ${description}`;
    if (code) return code;
  } catch {
    // Fall through to the generic message below.
  }
  return "Google did not include an error reason.";
}

function stripTrailingPeriod(value: string): string {
  return value.replace(/\.+$/, "");
}

async function syncGoogleCalendar(
  tokens: ConnectedCalendarTokenSet,
  cursor: SyncCursor | null,
  fetchImpl: ProviderFetch
): Promise<SyncResult> {
  const params = new URLSearchParams({ singleEvents: "true" });
  const syncToken = cursor?.syncToken ?? null;
  if (syncToken) {
    params.set("syncToken", syncToken);
  } else {
    params.set("timeMin", addDaysIso(-SYNC_PAST_DAYS));
    params.set("timeMax", addDaysIso(SYNC_FUTURE_DAYS));
  }

  const response = await providerFetch(
    "google",
    `${GOOGLE_CALENDAR_EVENTS_URL}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    fetchImpl
  );

  if (response.status === 410) {
    return {
      events: [],
      removedExternalIds: [],
      nextCursor: { syncToken: null },
      didFullResync: true,
      syncTokenGone: true
    };
  }

  if (!response.ok) {
    throw new Error(`Google calendar sync failed (${response.status}): ${await readGoogleErrorMessage(response)}`);
  }

  const json = (await response.json()) as {
    items?: GoogleCalendarEvent[];
    nextSyncToken?: string;
  };
  const events: NormalizedExternalEvent[] = [];
  for (const item of json.items ?? []) {
    const mapped = mapGoogleCalendarEvent(item);
    if (mapped) events.push(mapped);
  }

  return {
    events,
    removedExternalIds: [],
    nextCursor: { syncToken: json.nextSyncToken ?? syncToken ?? null, deltaLink: null },
    didFullResync: !syncToken
  };
}
