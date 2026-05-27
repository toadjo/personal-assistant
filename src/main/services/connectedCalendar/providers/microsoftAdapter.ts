import type { ConnectedCalendarTokenSet } from "../../connectedCalendarSecrets";
import { getMicrosoftOAuthClientId, MICROSOFT_CALENDAR_SCOPE } from "./config";
import { generateOAuthState, generatePkcePair } from "./pkce";
import { providerFetch } from "./providerHttp";
import type { ConnectedCalendarProviderAdapter, NormalizedExternalEvent, ProviderFetch, SyncResult } from "./types";

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MICROSOFT_PROFILE_URL = "https://graph.microsoft.com/v1.0/me";
const MICROSOFT_CALENDAR_VIEW_URL = "https://graph.microsoft.com/v1.0/me/calendarView";

const SYNC_PAST_DAYS = 90;
const SYNC_FUTURE_DAYS = 365;

type MicrosoftDateTimeTimeZone = { dateTime?: string; timeZone?: string };
type MicrosoftOnlineMeeting = { joinUrl?: string };
type MicrosoftCalendarEvent = {
  id?: string;
  subject?: string;
  start?: MicrosoftDateTimeTimeZone;
  end?: MicrosoftDateTimeTimeZone;
  isAllDay?: boolean;
  webLink?: string;
  lastModifiedDateTime?: string;
  location?: { displayName?: string };
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: MicrosoftOnlineMeeting;
  attendees?: unknown[];
};

export function mapMicrosoftCalendarEvent(event: MicrosoftCalendarEvent): NormalizedExternalEvent | null {
  if (!event.id) return null;
  const startAt = normalizeMicrosoftDateTime(event.start, Boolean(event.isAllDay));
  const endAt = normalizeMicrosoftDateTime(event.end, Boolean(event.isAllDay));
  if (!startAt || !endAt) return null;

  const isOnlineMeeting = Boolean(event.isOnlineMeeting);
  const onlineMeetingProvider = event.onlineMeetingProvider?.trim() || null;
  const onlineMeetingUrl = event.onlineMeeting?.joinUrl?.trim() || null;

  return {
    externalId: event.id,
    calendarId: "primary",
    calendarName: "Calendar",
    title: event.subject?.trim() || "(No title)",
    startAt,
    endAt,
    allDay: Boolean(event.isAllDay),
    location: event.location?.displayName?.trim() || null,
    status: null,
    attendeesCount: Array.isArray(event.attendees) ? event.attendees.length : 0,
    htmlLink: event.webLink ?? null,
    etag: null,
    updatedAtProvider: event.lastModifiedDateTime ?? null,
    isOnlineMeeting,
    onlineMeetingProvider,
    onlineMeetingUrl
  };
}

function normalizeMicrosoftDateTime(
  value: MicrosoftDateTimeTimeZone | undefined,
  allDay: boolean
): string | null {
  if (!value?.dateTime) return null;
  if (allDay) {
    return `${value.dateTime.slice(0, 10)}T00:00:00.000Z`;
  }
  let dateTime = value.dateTime;
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(dateTime)) {
    dateTime = `${dateTime}Z`;
  }
  return new Date(dateTime).toISOString();
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function createMicrosoftCalendarAdapter(fetchImpl: ProviderFetch = fetch): ConnectedCalendarProviderAdapter {
  return {
    provider: "microsoft",
    async createAuthRequest(redirectUri: string) {
      const clientId = getMicrosoftOAuthClientId();
      if (!clientId) {
        throw new Error("Microsoft Calendar client id is not configured.");
      }
      const { codeVerifier, codeChallenge } = generatePkcePair();
      const state = generateOAuthState();
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        response_mode: "query",
        scope: MICROSOFT_CALENDAR_SCOPE,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
      });
      return {
        authUrl: `${MICROSOFT_AUTH_URL}?${params.toString()}`,
        state,
        codeVerifier
      };
    },
    async exchangeCode(input) {
      return exchangeMicrosoftTokens(input, fetchImpl);
    },
    async refreshTokens(tokens) {
      if (!tokens.refreshToken) {
        throw new Error("Microsoft refresh token is unavailable. Reconnect the account.");
      }
      const refreshed = await exchangeMicrosoftTokens(
        { grantType: "refresh_token", refreshToken: tokens.refreshToken },
        fetchImpl
      );
      return { ...tokens, ...refreshed, refreshToken: refreshed.refreshToken ?? tokens.refreshToken };
    },
    async getAccountProfile(tokens) {
      const response = await providerFetch(
        "microsoft",
        MICROSOFT_PROFILE_URL,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            Prefer: 'outlook.timezone="UTC"'
          }
        },
        fetchImpl
      );
      if (!response.ok) {
        throw new Error(`Microsoft profile request failed (${response.status}).`);
      }
      const body = (await response.json()) as { mail?: string; userPrincipalName?: string; displayName?: string };
      const email = (body.mail ?? body.userPrincipalName)?.trim();
      if (!email) {
        throw new Error("Microsoft profile did not include an email address.");
      }
      return { email, label: body.displayName?.trim() || email };
    },
    async syncCalendar(input) {
      return syncMicrosoftCalendar(input.tokens, fetchImpl);
    }
  };
}

async function exchangeMicrosoftTokens(
  input:
    | { code: string; codeVerifier: string; redirectUri: string }
    | { grantType: "refresh_token"; refreshToken: string },
  fetchImpl: ProviderFetch
): Promise<ConnectedCalendarTokenSet> {
  const clientId = getMicrosoftOAuthClientId();
  if (!clientId) {
    throw new Error("Microsoft Calendar client id is not configured.");
  }
  const body = new URLSearchParams({ client_id: clientId });
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
    "microsoft",
    MICROSOFT_TOKEN_URL,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
    fetchImpl
  );
  if (!response.ok) {
    throw new Error(`Microsoft token exchange failed (${response.status}).`);
  }
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!json.access_token) {
    throw new Error("Microsoft token response did not include an access token.");
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

async function syncMicrosoftCalendar(tokens: ConnectedCalendarTokenSet, fetchImpl: ProviderFetch): Promise<SyncResult> {
  const params = new URLSearchParams({
    startDateTime: addDaysIso(-SYNC_PAST_DAYS),
    endDateTime: addDaysIso(SYNC_FUTURE_DAYS),
    $orderby: "start/dateTime"
  });
  const response = await providerFetch(
    "microsoft",
    `${MICROSOFT_CALENDAR_VIEW_URL}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Prefer: 'outlook.timezone="UTC"'
      }
    },
    fetchImpl
  );
  if (!response.ok) {
    throw new Error(`Microsoft calendar sync failed (${response.status}).`);
  }
  const json = (await response.json()) as { value?: MicrosoftCalendarEvent[] };
  const events: NormalizedExternalEvent[] = [];
  for (const item of json.value ?? []) {
    const mapped = mapMicrosoftCalendarEvent(item);
    if (mapped) events.push(mapped);
  }
  return {
    events,
    removedExternalIds: [],
    nextCursor: { syncToken: null, deltaLink: null },
    didFullResync: true
  };
}
