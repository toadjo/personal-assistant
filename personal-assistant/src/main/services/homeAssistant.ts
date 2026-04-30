import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { getHaToken, saveHaToken } from "./secrets";

let baseUrl = "";
const HA_BASE_URL_KEY = "ha.baseUrl";

export async function configureHomeAssistant(url: string, token: string): Promise<void> {
  baseUrl = normalizeUrl(url);
  if (!baseUrl) throw new Error("Home Assistant URL is required");
  await saveHaToken(token);
  getDb()
    .prepare("INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt")
    .run(HA_BASE_URL_KEY, baseUrl, new Date().toISOString());
}

export async function getHomeAssistantConfig(): Promise<{ url: string; hasToken: boolean }> {
  const url = getConfiguredBaseUrl();
  const token = await getHaToken();
  return { url, hasToken: Boolean(token) };
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getHaToken();
  const url = getConfiguredBaseUrl();
  if (!token || !url) throw new Error("Home Assistant not configured");
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {})
    }
  });
}

export async function testConnection(): Promise<boolean> {
  const res = await authedFetch("/api/");
  return res.ok;
}

export async function refreshEntities(): Promise<void> {
  const res = await authedFetch("/api/states");
  if (!res.ok) throw new Error(`HA sync failed: ${res.status}`);
  const entities = (await res.json()) as Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>;
  const db = getDb();
  const upsert = db.prepare(
    "INSERT INTO devices_cache (id, entityId, friendlyName, domain, state, attributes, lastSeenAt) VALUES (@id,@entityId,@friendlyName,@domain,@state,@attributes,@lastSeenAt) ON CONFLICT(entityId) DO UPDATE SET friendlyName=excluded.friendlyName, domain=excluded.domain, state=excluded.state, attributes=excluded.attributes, lastSeenAt=excluded.lastSeenAt"
  );
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const e of entities) {
      const domain = e.entity_id.split(".")[0];
      if (!["switch", "light"].includes(domain)) continue;
      upsert.run({
        id: randomUUID(),
        entityId: e.entity_id,
        friendlyName: String(e.attributes.friendly_name || e.entity_id),
        domain,
        state: e.state,
        attributes: JSON.stringify(e.attributes),
        lastSeenAt: now
      });
    }
  });
  tx();
}

export async function toggleEntity(entityId: string): Promise<void> {
  const domain = entityId.split(".")[0];
  const res = await authedFetch(`/api/services/${domain}/toggle`, {
    method: "POST",
    body: JSON.stringify({ entity_id: entityId })
  });
  if (!res.ok) throw new Error(`Toggle failed: ${res.status}`);
}

function getConfiguredBaseUrl(): string {
  if (baseUrl) return baseUrl;
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(HA_BASE_URL_KEY) as { value?: string } | undefined;
  baseUrl = normalizeUrl(row?.value || "");
  return baseUrl;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}
