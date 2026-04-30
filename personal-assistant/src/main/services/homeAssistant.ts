import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { getHaToken, saveHaToken } from "./secrets";

let baseUrl = "";
const HA_BASE_URL_KEY = "ha.baseUrl";

export async function configureHomeAssistant(url: string, token: string): Promise<void> {
  baseUrl = normalizeUrl(url);
  if (!baseUrl) throw new Error("Home Assistant URL is required");
  const trimmedToken = token.trim();
  if (trimmedToken) {
    await saveHaToken(trimmedToken);
  } else {
    const existingToken = await getHaToken();
    if (!existingToken) {
      throw new Error("Home Assistant token is required for initial setup");
    }
  }
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
  try {
    return await fetch(`${url}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {})
      }
    });
  } catch (error) {
    throw new Error(`Home Assistant request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function testConnection(): Promise<boolean> {
  const res = await authedFetch("/api/");
  if (!res.ok) {
    throw new Error(`Home Assistant connection failed (${res.status} ${res.statusText || "unknown"}). Check URL/token.`);
  }
  return true;
}

export async function refreshEntities(): Promise<void> {
  const res = await authedFetch("/api/states");
  if (!res.ok) {
    throw new Error(`Home Assistant sync failed (${res.status} ${res.statusText || "unknown"}). Check URL/token permissions.`);
  }
  const body = await res.json();
  if (!Array.isArray(body)) {
    throw new Error("Home Assistant sync failed: unexpected response payload.");
  }
  const entities = body as Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>;
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
  const normalizedEntityId = entityId.trim().toLowerCase();
  if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(normalizedEntityId)) {
    throw new Error("Invalid Home Assistant entity ID.");
  }
  const domain = normalizedEntityId.split(".")[0];
  if (!["switch", "light"].includes(domain)) {
    throw new Error(`Unsupported device domain "${domain}" for toggle.`);
  }
  const res = await authedFetch(`/api/services/${domain}/toggle`, {
    method: "POST",
    body: JSON.stringify({ entity_id: normalizedEntityId })
  });
  if (!res.ok) {
    throw new Error(`Device toggle failed (${res.status} ${res.statusText || "unknown"}). Verify entity availability and token scope.`);
  }
}

function getConfiguredBaseUrl(): string {
  if (baseUrl) return baseUrl;
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(HA_BASE_URL_KEY) as { value?: string } | undefined;
  baseUrl = normalizeUrl(row?.value || "");
  return baseUrl;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}
