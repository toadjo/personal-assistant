import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { getHaToken, saveHaToken } from "./secrets";

let baseUrl = "";
const HA_BASE_URL_KEY = "ha.baseUrl";
const HA_REQUEST_TIMEOUT_MS = 10_000;
const HA_RETRY_DELAY_MS = 450;
const HA_MAX_IDEMPOTENT_RETRIES = 1;
const HA_RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

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

type HaFetchOptions = {
  allowRetry?: boolean;
};

async function authedFetch(path: string, init?: RequestInit, options?: HaFetchOptions): Promise<Response> {
  const token = await getHaToken();
  const url = getConfiguredBaseUrl();
  if (!token || !url) throw new Error("Home Assistant not configured.");
  if (!path.startsWith("/")) throw new Error("Home Assistant request path must start with '/'.");
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const method = (init?.method || "GET").toUpperCase();
  const isIdempotentMethod = method === "GET" || method === "HEAD";
  const canRetry = (options?.allowRetry ?? true) && isIdempotentMethod;
  const maxAttempts = canRetry ? HA_MAX_IDEMPOTENT_RETRIES + 1 : 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutRef = setTimeout(() => controller.abort(), HA_REQUEST_TIMEOUT_MS);
    timeoutRef.unref();
    try {
      const res = await fetch(`${url}${path}`, {
        ...init,
        method,
        headers,
        signal: controller.signal
      });
      if (attempt < maxAttempts && HA_RETRYABLE_STATUS_CODES.has(res.status)) {
        await sleep(HA_RETRY_DELAY_MS);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      const isAbortError = error instanceof Error && error.name === "AbortError";
      if (!isAbortError && attempt < maxAttempts) {
        await sleep(HA_RETRY_DELAY_MS);
        continue;
      }
      if (isAbortError) {
        throw new Error(`Home Assistant request timed out after ${HA_REQUEST_TIMEOUT_MS}ms.`);
      }
      throw new Error(`Home Assistant request failed: ${toErrorMessage(error)}`);
    } finally {
      clearTimeout(timeoutRef);
    }
  }
  throw new Error(`Home Assistant request failed: ${toErrorMessage(lastError)}`);
}

export async function testConnection(): Promise<boolean> {
  const apiRootResponse = await authedFetch("/api/");
  if (apiRootResponse.ok) {
    return true;
  }
  if (apiRootResponse.status === 404) {
    const configResponse = await authedFetch("/api/config");
    if (configResponse.ok) {
      return true;
    }
    throw new Error(await formatHaHttpError("connection failed", configResponse, "Check URL/token."));
  }
  throw new Error(await formatHaHttpError("connection failed", apiRootResponse, "Check URL/token."));
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
  if (typeof entityId !== "string") {
    throw new Error("Invalid Home Assistant entity ID.");
  }
  const normalizedEntityId = entityId.trim().toLowerCase();
  if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(normalizedEntityId)) {
    throw new Error("Invalid Home Assistant entity ID.");
  }
  const domain = normalizedEntityId.split(".")[0];
  if (!["switch", "light"].includes(domain)) {
    throw new Error(`Unsupported device domain "${domain}" for toggle.`);
  }
  // Prefer Home Assistant's native toggle to reduce stale-state race windows.
  const toggleResponse = await authedFetch(`/api/services/${domain}/toggle`, {
    method: "POST",
    body: JSON.stringify({ entity_id: normalizedEntityId })
  }, { allowRetry: false });
  if (toggleResponse.ok) {
    return;
  }

  const shouldFallbackToStatefulToggle = toggleResponse.status === 404 || toggleResponse.status === 405;
  if (!shouldFallbackToStatefulToggle) {
    throw new Error(await formatHaHttpError("device toggle failed", toggleResponse, "Verify entity availability and token scope."));
  }

  const currentState = await getEntityState(normalizedEntityId);
  const service = resolveToggleService(currentState);
  const fallbackResponse = await authedFetch(`/api/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify({ entity_id: normalizedEntityId })
  }, { allowRetry: false });
  if (!fallbackResponse.ok) {
    throw new Error(await formatHaHttpError("device toggle fallback failed", fallbackResponse, "Verify entity availability and token scope."));
  }
}

async function getEntityState(entityId: string): Promise<string> {
  const res = await authedFetch(`/api/states/${entityId}`);
  if (!res.ok) {
    throw new Error(await formatHaHttpError("device lookup failed", res, "Verify entity availability and token scope."));
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("Home Assistant device lookup failed: invalid JSON response.");
  }
  const state = (body as { state?: unknown } | null)?.state;
  if (typeof state !== "string" || !state.trim()) {
    throw new Error("Home Assistant device lookup failed: missing entity state.");
  }
  return state.trim().toLowerCase();
}

function resolveToggleService(currentState: string): "turn_on" | "turn_off" {
  if (currentState === "on") return "turn_off";
  if (currentState === "off") return "turn_on";
  if (currentState === "turning_on" || currentState === "turning_off") {
    throw new Error(`Home Assistant device is transitioning (${currentState}). Retry in a moment.`);
  }
  if (currentState === "unavailable" || currentState === "unknown") {
    throw new Error(`Home Assistant device is currently ${currentState}. Refresh entities and retry.`);
  }
  // Keep toggle resilient for uncommon but valid HA states.
  return "turn_on";
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
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
