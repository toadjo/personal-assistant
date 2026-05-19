import { mainLog } from "../log";
import { getSetting, setSetting } from "./settingsRepository";
import {
  decryptSecret,
  encryptSecret,
  isEncrypted,
  SecureStorageUnavailableError
} from "./secureSecrets";

const TOKEN_KEY = "ha.token";

export async function saveHaToken(token: string): Promise<void> {
  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (!normalizedToken) {
    throw new Error("Home Assistant token is required.");
  }
  const now = new Date().toISOString();
  try {
    const encrypted = encryptSecret(normalizedToken);
    setSetting(TOKEN_KEY, encrypted, now);
  } catch (error) {
    if (error instanceof SecureStorageUnavailableError) {
      throw error;
    }
    throw new Error("Failed to encrypt Home Assistant token.");
  }
}

export async function getHaToken(): Promise<string | null> {
  const raw = getSetting(TOKEN_KEY);
  if (typeof raw !== "string" || !raw) return null;
  
  // If not encrypted, it's legacy plaintext - treat as insecure
  if (!isEncrypted(raw)) {
    mainLog.warn("Legacy plaintext HA token detected. For security, please reconnect Home Assistant integration.");
    return null;
  }
  
  const decrypted = decryptSecret(raw);
  if (decrypted === null) {
    mainLog.error("Failed to decrypt Home Assistant token.");
  }
  return decrypted;
}
