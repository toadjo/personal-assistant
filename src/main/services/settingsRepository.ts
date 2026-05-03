import { getDb } from "../db";

/** Centralized app_settings access (upsert / read / delete). */
export function getSetting(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as { value?: string } | undefined;
  const v = row?.value;
  return typeof v === "string" ? v : undefined;
}

export function setSetting(key: string, value: string, updatedAtIso?: string): void {
  const updatedAt = updatedAtIso ?? new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt"
    )
    .run(key, value, updatedAt);
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM app_settings WHERE key = ?").run(key);
}
