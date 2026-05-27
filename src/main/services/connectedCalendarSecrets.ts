import { mainLog } from "../log";
import { deleteSetting, getSetting, setSetting } from "./settingsRepository";
import { decryptSecret, encryptSecret, isEncrypted, SecureStorageUnavailableError } from "./secureSecrets";

function tokenKey(accountId: string): string {
  return `connectedCalendar.${accountId}.tokens`;
}

export function isConnectedCalendarTokenSettingKey(key: string): boolean {
  return /^connectedCalendar\..+\.tokens$/.test(key);
}

export type ConnectedCalendarTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: string;
  scope?: string;
  tokenType?: string;
};

export async function saveConnectedCalendarTokens(accountId: string, tokens: ConnectedCalendarTokenSet): Promise<void> {
  if (!accountId) {
    throw new Error("Connected calendar account id is required.");
  }
  if (!tokens.accessToken || !tokens.accessToken.trim()) {
    throw new Error("Connected calendar access token is required.");
  }
  const now = new Date().toISOString();
  try {
    const encrypted = encryptSecret(JSON.stringify(tokens));
    setSetting(tokenKey(accountId), encrypted, now);
  } catch (error) {
    if (error instanceof SecureStorageUnavailableError) {
      throw error;
    }
    throw new Error("Failed to encrypt connected calendar tokens.");
  }
}

export async function getConnectedCalendarTokens(accountId: string): Promise<ConnectedCalendarTokenSet | null> {
  if (!accountId) return null;
  const raw = getSetting(tokenKey(accountId));
  if (!raw) return null;
  if (!isEncrypted(raw)) {
    mainLog.warn("Legacy plaintext connected calendar tokens detected. Reconnect is required.");
    return null;
  }
  const decrypted = decryptSecret(raw);
  if (!decrypted) {
    mainLog.error("Failed to decrypt connected calendar tokens.");
    return null;
  }
  try {
    return JSON.parse(decrypted) as ConnectedCalendarTokenSet;
  } catch {
    mainLog.error("Connected calendar token payload was not valid JSON.");
    return null;
  }
}

export function clearConnectedCalendarTokens(accountId: string): void {
  if (!accountId) return;
  deleteSetting(tokenKey(accountId));
}
