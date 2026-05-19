import { safeStorage } from "electron";
import { mainLog } from "../log";
import { deleteSetting, getSetting, setSetting } from "./settingsRepository";

const API_KEY_SETTING = "ai.apiKey";
const ENCRYPTED_PREFIX = "sse1:";

/**
 * Persist the user-owned AI API key. Mirrors the Home Assistant `secrets.ts` pattern:
 * encrypt with `safeStorage` when available, otherwise warn and store plaintext in the local SQLite
 * `app_settings` table. The value never crosses to the renderer.
 */
export async function saveAiApiKey(apiKey: string): Promise<void> {
  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!trimmed) {
    throw new Error("AI API key is required.");
  }
  const now = new Date().toISOString();
  if (safeStorage.isEncryptionAvailable()) {
    const buf = safeStorage.encryptString(trimmed);
    setSetting(API_KEY_SETTING, `${ENCRYPTED_PREFIX}${buf.toString("base64")}`, now);
    return;
  }
  mainLog.warn("OS encryption (safeStorage) is not available; storing the AI API key in SQLite as plaintext.");
  setSetting(API_KEY_SETTING, trimmed, now);
}

export async function getAiApiKey(): Promise<string | null> {
  const raw = getSetting(API_KEY_SETTING);
  if (typeof raw !== "string" || !raw) return null;
  if (raw.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const buf = Buffer.from(raw.slice(ENCRYPTED_PREFIX.length), "base64");
      return safeStorage.decryptString(buf);
    } catch (error) {
      mainLog.error("Failed to decrypt AI API key.", error);
      return null;
    }
  }
  return raw;
}

export function clearAiApiKey(): void {
  deleteSetting(API_KEY_SETTING);
}

export function hasStoredAiApiKey(): boolean {
  const raw = getSetting(API_KEY_SETTING);
  return typeof raw === "string" && raw.length > 0;
}
