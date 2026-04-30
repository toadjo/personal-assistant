import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { getHaToken, saveHaToken } from "./secrets";

let baseUrl = "";
const HA_BASE_URL_KEY = "ha.baseUrl";

export async function configureHomeAssistant(url: string, token: string): Promise<void> {
  baseUrl = normalizeUrl(url);
  if (!baseUrl) throw new Error("Home Assistant URL is required");
  const trimmedToken = typeof token === "string" ? token.trim() : "";
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
  if (!path.startsWith("/")) throw new Error("Home Assistant request path must start with '/'.");
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
    throw new Error(await formatHaHttpError("connection failed", res, "Check URL/token."));
  }
  return true;
}

export async function refreshEntities(): Promise<void> {
  const res = await authedFetch("/api/states");
  if (!res.ok) {
    throw new Error(await formatHaHttpError("sync failed", res, "Check URL/token permissions."));
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("Home Assistant sync failed: invalid JSON response.");
  }
  if (!Array.isArray(body)) {
    throw new Error("Home Assistant sync failed: unexpected response payload.");
  }
  const entities = body as Array<{ entity_id?: unknown; state?: unknown; attributes?: unknown }>;
  const db = getDb();
  const upsert = db.prepare(
    "INSERT INTO devices_cache (id, entityId, friendlyName, domain, state, attributes, lastSeenAt) VALUES (@id,@entityId,@friendlyName,@domain,@state,@attributes,@lastSeenAt) ON CONFLICT(entityId) DO UPDATE SET friendlyName=excluded.friendlyName, domain=excluded.domain, state=excluded.state, attributes=excluded.attributes, lastSeenAt=excluded.lastSeenAt"
  );
  const removeStale = db.prepare("DELETE FROM devices_cache WHERE domain IN ('switch','light') AND entityId NOT IN (SELECT value FROM json_each(?))");
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    const syncedEntityIds: string[] = [];
    for (const e of entities) {
      if (typeof e.entity_id !== "string" || !e.entity_id.includes(".")) continue;
      const domain = e.entity_id.split(".")[0];
      if (!["switch", "light"].includes(domain)) continue;
      const attributes = e.attributes && typeof e.attributes === "object" && !Array.isArray(e.attributes) ? e.attributes : {};
      syncedEntityIds.push(e.entity_id);
      upsert.run({
        id: randomUUID(),
        entityId: e.entity_id,
        friendlyName: String((attributes as Record<string, unknown>).friendly_name || e.entity_id),
        domain,
        state: typeof e.state === "string" ? e.state : "unknown",
        attributes: JSON.stringify(attributes),
        lastSeenAt: now
      });
    }
    if (syncedEntityIds.length) {
      removeStale.run(JSON.stringify(syncedEntityIds));
    } else {
      db.prepare("DELETE FROM devices_cache WHERE domain IN ('switch','light')").run();
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
    throw new Error(await formatHaHttpError("device toggle failed", res, "Verify entity availability and token scope."));
  }
}

async function formatHaHttpError(prefix: string, res: Response, fallback: string): Promise<string> {
  const statusText = res.statusText || "unknown";
  const details = await safeReadResponseDetails(res);
  const reason =
    res.status === 401
      ? "Token is invalid or expired."
      : res.status === 403
        ? "Token lacks permissions."
        : res.status === 404
          ? "Endpoint or URL is invalid."
          : fallback;
  return `Home Assistant ${prefix} (${res.status} ${statusText}). ${reason}${details ? ` Details: ${details}` : ""}`;
}

async function safeReadResponseDetails(res: Response): Promise<string> {
  try {
    const text = (await res.text()).trim();
    if (!text) return "";
    return text.slice(0, 180);
  } catch {
    return "";
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
