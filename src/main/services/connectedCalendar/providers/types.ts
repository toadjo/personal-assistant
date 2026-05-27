import type { ConnectedCalendarProvider } from "../../../../shared/types";
import type { ConnectedCalendarTokenSet } from "../../connectedCalendarSecrets";

export type { ConnectedCalendarTokenSet as TokenSet };

export type NormalizedExternalEvent = {
  externalId: string;
  calendarId: string | null;
  calendarName: string | null;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string | null;
  status: string | null;
  attendeesCount: number;
  htmlLink: string | null;
  etag: string | null;
  updatedAtProvider: string | null;
};

export type SyncCursor = {
  syncToken?: string | null;
  deltaLink?: string | null;
};

export type SyncResult = {
  events: NormalizedExternalEvent[];
  removedExternalIds: string[];
  nextCursor: SyncCursor;
  didFullResync: boolean;
  syncTokenGone?: boolean;
};

export type ConnectedCalendarProviderAdapter = {
  provider: ConnectedCalendarProvider;
  createAuthRequest(redirectUri: string): Promise<{ authUrl: string; state: string; codeVerifier: string }>;
  exchangeCode(input: { code: string; codeVerifier: string; redirectUri: string }): Promise<ConnectedCalendarTokenSet>;
  refreshTokens(tokens: ConnectedCalendarTokenSet): Promise<ConnectedCalendarTokenSet>;
  getAccountProfile(tokens: ConnectedCalendarTokenSet): Promise<{ email: string; label: string }>;
  syncCalendar(input: { accountId: string; tokens: ConnectedCalendarTokenSet; cursor: SyncCursor | null }): Promise<SyncResult>;
};

export type ProviderFetch = typeof fetch;
