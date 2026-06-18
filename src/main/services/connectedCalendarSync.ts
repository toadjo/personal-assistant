import type { ConnectedCalendarAccount } from "../../shared/types";
import { mainLog } from "../log";
import { checkConnectedCalendarAllowed } from "../security/outboundGuard";
import {
  getConnectedCalendarAccountById,
  handleGoogleSyncTokenGone,
  listConnectedCalendarAccounts,
  listExternalCalendarSyncStateByAccount,
  setConnectedCalendarAccountSyncState,
  upsertExternalCalendarEvent,
  upsertExternalCalendarSyncState
} from "./connectedCalendar";
import { getConnectedCalendarProviderAdapter } from "./connectedCalendar/providers";
import type { SyncCursor } from "./connectedCalendar/providers/types";
import {
  getConnectedCalendarTokens,
  saveConnectedCalendarTokens,
  type ConnectedCalendarTokenSet
} from "./connectedCalendarSecrets";
import { SecureStorageUnavailableError } from "./secureSecrets";

function tokenNeedsRefresh(tokens: ConnectedCalendarTokenSet): boolean {
  if (!tokens.expiryDate) return false;
  const expiresAt = Date.parse(tokens.expiryDate);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - Date.now() < 60_000;
}

async function resolveTokens(
  account: ConnectedCalendarAccount
): Promise<ConnectedCalendarTokenSet> {
  const tokens = await getConnectedCalendarTokens(account.id);
  if (!tokens) {
    throw new Error("Connected calendar tokens are unavailable. Reconnect the account.");
  }
  if (!tokenNeedsRefresh(tokens)) {
    return tokens;
  }
  const adapter = getConnectedCalendarProviderAdapter(account.provider);
  const refreshed = await adapter.refreshTokens(tokens);
  const merged: ConnectedCalendarTokenSet = {
    ...tokens,
    ...refreshed,
    refreshToken: refreshed.refreshToken ?? tokens.refreshToken
  };
  try {
    await saveConnectedCalendarTokens(account.id, merged);
  } catch (error) {
    if (error instanceof SecureStorageUnavailableError) {
      throw error;
    }
    throw new Error("Failed to refresh connected calendar tokens.");
  }
  return merged;
}

export async function syncConnectedCalendarAccount(accountId: string): Promise<ConnectedCalendarAccount> {
  checkConnectedCalendarAllowed();
  const account = getConnectedCalendarAccountById(accountId);
  if (!account) {
    throw new Error(`Connected calendar account not found: ${accountId}`);
  }

  const previousLastSyncAt = account.lastSyncAt;
  setConnectedCalendarAccountSyncState(accountId, "syncing", { syncError: null });

  try {
    const tokens = await resolveTokens(account);
    const adapter = getConnectedCalendarProviderAdapter(account.provider);
    const syncStates = listExternalCalendarSyncStateByAccount(accountId);
    const primaryState = syncStates.find((row) => row.calendarId === "primary");
    const cursor: SyncCursor | null = primaryState
      ? { syncToken: primaryState.syncToken, deltaLink: primaryState.deltaLink }
      : null;

    let result = await adapter.syncCalendar({ accountId, tokens, cursor });

    if (result.syncTokenGone && account.provider === "google") {
      handleGoogleSyncTokenGone(accountId, "primary");
      result = await adapter.syncCalendar({ accountId, tokens, cursor: null });
    }

    for (const event of result.events) {
      upsertExternalCalendarEvent({
        accountId,
        provider: account.provider,
        externalId: event.externalId,
        calendarId: event.calendarId,
        calendarName: event.calendarName,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        location: event.location,
        status: event.status,
        attendeesCount: event.attendeesCount,
        htmlLink: event.htmlLink,
        etag: event.etag,
        updatedAtProvider: event.updatedAtProvider,
        isOnlineMeeting: event.isOnlineMeeting,
        onlineMeetingProvider: event.onlineMeetingProvider,
        onlineMeetingUrl: event.onlineMeetingUrl
      });
    }

    upsertExternalCalendarSyncState({
      accountId,
      calendarId: "primary",
      provider: account.provider,
      syncToken: result.nextCursor.syncToken ?? null,
      deltaLink: result.nextCursor.deltaLink ?? null,
      lastFullSyncAt: result.didFullResync ? new Date().toISOString() : primaryState?.lastFullSyncAt ?? null
    });

    return setConnectedCalendarAccountSyncState(accountId, "synced");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connected calendar sync failed.";
    mainLog.warn(`Connected calendar sync failed accountId=${accountId}`);
    return setConnectedCalendarAccountSyncState(accountId, "error", {
      syncError: message,
      lastSyncAt: previousLastSyncAt
    });
  }
}

export async function syncAllConnectedCalendarAccounts(): Promise<ConnectedCalendarAccount[]> {
  checkConnectedCalendarAllowed();
  const accounts = listConnectedCalendarAccounts();
  const results: ConnectedCalendarAccount[] = [];
  for (const account of accounts) {
    results.push(await syncConnectedCalendarAccount(account.id));
  }
  return results;
}
