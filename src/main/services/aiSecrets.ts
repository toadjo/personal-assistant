import { mainLog } from "../log";
import { deleteSetting, getSetting, setSetting } from "./settingsRepository";
import {
  decryptSecret,
  encryptSecret,
  isEncrypted,
  SecureStorageUnavailableError
} from "./secureSecrets";

const API_KEY_SETTING = "ai.apiKey";

/**
 * Persist the user-owned AI API key.
 * Fails closed if OS encryption is unavailable.
 */
export async function saveAiApiKey(apiKey: string): Promise<void> {
  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!trimmed) {
    throw new Error("AI API key is required.");
  }
  const now = new Date().toISOString();
  try {
    const encrypted = encryptSecret(trimmed);
    setSetting(API_KEY_SETTING, encrypted, now);
  } catch (error) {
    if (error instanceof SecureStorageUnavailableError) {
      throw error;
    }
    throw new Error("Failed to encrypt AI API key.");
  }
}

export async function getAiApiKey(): Promise<string | null> {
  const raw = getSetting(API_KEY_SETTING);
  if (typeof raw !== "string" || !raw) return null;
  
  // If not encrypted, it's legacy plaintext - treat as insecure
  if (!isEncrypted(raw)) {
    mainLog.warn("Legacy plaintext AI API key detected. For security, please reconnect AI integration.");
    return null;
  }
  
  const decrypted = decryptSecret(raw);
  if (decrypted === null) {
    mainLog.error("Failed to decrypt AI API key.");
  }
  return decrypted;
}

export function clearAiApiKey(): void {
  deleteSetting(API_KEY_SETTING);
}

export function hasStoredAiApiKey(): boolean {
  const raw = getSetting(API_KEY_SETTING);
  return typeof raw === "string" && raw.length > 0;
}
