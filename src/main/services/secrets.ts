import { safeStorage } from "electron";
import { getDb } from "../db";
import { mainLog } from "../log";

const TOKEN_KEY = "ha.token";
const ENCRYPTED_PREFIX = "sse1:";

export async function saveHaToken(token: string): Promise<void> {
  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (!normalizedToken) {
    throw new Error("Home Assistant token is required.");
  }
  const now = new Date().toISOString();
  if (safeStorage.isEncryptionAvailable()) {
    const buf = safeStorage.encryptString(normalizedToken);
    const value = `${ENCRYPTED_PREFIX}${buf.toString("base64")}`;
    getDb()
      .prepare(
        "INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt"
      )
      .run(TOKEN_KEY, value, now);
    return;
  }
  mainLog.warn("OS encryption (safeStorage) is not available; storing the HA token in SQLite as plaintext.");
  getDb()
    .prepare(
      "INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt"
    )
    .run(TOKEN_KEY, normalizedToken, now);
}

export async function getHaToken(): Promise<string | null> {
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(TOKEN_KEY) as
    | { value?: string }
    | undefined;
  const raw = row?.value;
  if (typeof raw !== "string" || !raw) return null;
  if (raw.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const buf = Buffer.from(raw.slice(ENCRYPTED_PREFIX.length), "base64");
      return safeStorage.decryptString(buf);
    } catch (error) {
      mainLog.error("Failed to decrypt Home Assistant token.", error);
      return null;
    }
  }
  return raw;
}
