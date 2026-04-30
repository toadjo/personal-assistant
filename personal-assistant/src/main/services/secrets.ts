import { getDb } from "../db";

const SERVICE = "personal-assistant";
const ACCOUNT = "home-assistant-token";
const FALLBACK_KEY = "ha.token";

let cachedKeytar: {
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  getPassword: (service: string, account: string) => Promise<string | null>;
} | null | undefined;

function getKeytar() {
  if (cachedKeytar !== undefined) return cachedKeytar;
  try {
    cachedKeytar = require("keytar") as {
      setPassword: (service: string, account: string, password: string) => Promise<void>;
      getPassword: (service: string, account: string) => Promise<string | null>;
    };
  } catch {
    cachedKeytar = null;
  }
  return cachedKeytar;
}

export async function saveHaToken(token: string): Promise<void> {
  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (!normalizedToken) {
    throw new Error("Home Assistant token is required.");
  }
  const keytar = getKeytar();
  if (keytar) {
    await keytar.setPassword(SERVICE, ACCOUNT, normalizedToken);
    return;
  }
  getDb()
    .prepare("INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt")
    .run(FALLBACK_KEY, normalizedToken, new Date().toISOString());
}

export async function getHaToken(): Promise<string | null> {
  const keytar = getKeytar();
  if (keytar) {
    return keytar.getPassword(SERVICE, ACCOUNT);
  }
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(FALLBACK_KEY) as { value?: string } | undefined;
  return row?.value || null;
}
