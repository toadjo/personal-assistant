import { shell } from "electron";
import type { ConnectedCalendarAccount, ConnectedCalendarProvider } from "../../shared/types";
import { mainLog } from "../log";
import { checkConnectedCalendarAllowed } from "../security/outboundGuard";
import { isExternalUrlsAllowed } from "../security/policy";
import {
  createConnectedCalendarAccount,
  findConnectedCalendarAccountByProviderEmail,
  updateConnectedCalendarAccount
} from "./connectedCalendar";
import { DEFAULT_CALENDAR_ENABLED_FEATURES } from "./connectedCalendar/features";
import { startOAuthLoopbackServer } from "./connectedCalendar/oauthLoopback";
import { getConnectedCalendarProviderAdapter } from "./connectedCalendar/providers";
import { syncConnectedCalendarAccount } from "./connectedCalendarSync";
import { saveConnectedCalendarTokens } from "./connectedCalendarSecrets";
import { SecureStorageUnavailableError } from "./secureSecrets";

type PendingOAuthSession = {
  provider: ConnectedCalendarProvider;
  state: string;
  codeVerifier: string;
  redirectUri: string;
  loopback: Awaited<ReturnType<typeof startOAuthLoopbackServer>>;
  createdAt: number;
};

const pendingOAuthSessions = new Map<ConnectedCalendarProvider, PendingOAuthSession>();

export function validateOAuthCallbackState(expected: string, received: string): void {
  if (expected !== received) {
    throw new Error("OAuth state mismatch.");
  }
}
const OAUTH_SESSION_TTL_MS = 15 * 60 * 1000;

function clearPendingSession(provider: ConnectedCalendarProvider): void {
  const pending = pendingOAuthSessions.get(provider);
  if (pending) {
    pending.loopback.close();
    pendingOAuthSessions.delete(provider);
  }
}

function assertExternalUrlAllowed(): void {
  if (!isExternalUrlsAllowed()) {
    throw new Error("Opening external URLs is disabled by corporate policy.");
  }
}

export async function startConnectedCalendarOAuth(provider: ConnectedCalendarProvider): Promise<void> {
  checkConnectedCalendarAllowed();
  assertExternalUrlAllowed();
  clearPendingSession(provider);

  const adapter = getConnectedCalendarProviderAdapter(provider);
  const loopback = await startOAuthLoopbackServer();
  const auth = await adapter.createAuthRequest(loopback.redirectUri);

  pendingOAuthSessions.set(provider, {
    provider,
    state: auth.state,
    codeVerifier: auth.codeVerifier,
    redirectUri: loopback.redirectUri,
    loopback,
    createdAt: Date.now()
  });

  await shell.openExternal(auth.authUrl);
}

export async function completeConnectedCalendarOAuth(
  provider: ConnectedCalendarProvider
): Promise<ConnectedCalendarAccount> {
  checkConnectedCalendarAllowed();
  const pending = pendingOAuthSessions.get(provider);
  if (!pending) {
    throw new Error("No pending connected calendar authorization. Start OAuth first.");
  }
  if (Date.now() - pending.createdAt > OAUTH_SESSION_TTL_MS) {
    clearPendingSession(provider);
    throw new Error("Connected calendar authorization expired. Please try again.");
  }

  try {
    const callback = await pending.loopback.waitForCallback();
    validateOAuthCallbackState(pending.state, callback.state);

    const adapter = getConnectedCalendarProviderAdapter(provider);
    const tokens = await adapter.exchangeCode({
      code: callback.code,
      codeVerifier: pending.codeVerifier,
      redirectUri: pending.redirectUri
    });
    const profile = await adapter.getAccountProfile(tokens);

    let account =
      findConnectedCalendarAccountByProviderEmail(provider, profile.email) ??
      createConnectedCalendarAccount({
        provider,
        accountLabel: profile.label,
        email: profile.email,
        enabledFeatures: DEFAULT_CALENDAR_ENABLED_FEATURES,
        syncState: "connecting"
      });

    account = updateConnectedCalendarAccount({
      id: account.id,
      accountLabel: profile.label,
      email: profile.email,
      syncState: "connecting",
      syncError: null
    });

    try {
      await saveConnectedCalendarTokens(account.id, tokens);
    } catch (error) {
      if (error instanceof SecureStorageUnavailableError) {
        throw error;
      }
      throw new Error("Failed to store connected calendar tokens.");
    }

    return syncConnectedCalendarAccount(account.id);
  } catch (error) {
    mainLog.warn(
      `Connected calendar OAuth failed for provider=${provider}: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  } finally {
    clearPendingSession(provider);
  }
}

export function cancelConnectedCalendarOAuth(provider: ConnectedCalendarProvider): void {
  clearPendingSession(provider);
}
