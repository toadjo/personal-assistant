import { randomUUID } from "node:crypto";
import type { AssistantInvokeFailure } from "../../shared/invokeErrors";
import { getDb } from "../db";
import { getHaToken, saveHaToken } from "./secrets";
import { mainLog } from "../log";
import { assertHomeAssistantBaseUrl } from "./haUrlPolicy";
import { parseHaStatesResponse, type HaStateRow } from "./haStatesResponse";
import { getSetting, setSetting } from "./settingsRepository";
import { throwAssistantInvoke } from "./structuredInvokeError";
import { checkHostAllowed } from "../security/outboundGuard";

const HA_BASE_URL_KEY = "ha.baseUrl";
const HA_REQUEST_TIMEOUT_MS = 10_000;
const HA_RETRY_DELAY_MS = 450;
const HA_MAX_IDEMPOTENT_RETRIES = 1;
const HA_RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Test-only seam: allows Electron E2E tests to inject a fake fetch implementation
 * to simulate Home Assistant failures without requiring a live server.
 * Call `setTestFetchOverride(fn)` before invoking HA operations in tests.
 * Never set this in production code.
 */
let testFetchOverride: ((path: string, init?: RequestInit) => Promise<Response>) | null = null;

export function setTestFetchOverride(fn: ((path: string, init?: RequestInit) => Promise<Response>) | null): void {
  testFetchOverride = fn;
}

function throwHa(partial: Omit<AssistantInvokeFailure, "domain">): never {
  return throwAssistantInvoke({
    domain: "home_assistant",
    ...partial
  });
}

async function throwFromHttpResponse(res: Response, prefix: string, fallbackReason: string): Promise<never> {
  const message = await formatHaHttpError(prefix, res, fallbackReason);
  const retryable = HA_RETRYABLE_STATUS_CODES.has(res.status) || res.status === 408 || res.status === 429;
  return throwHa({
    code: `HTTP_${res.status}`,
    message,
    retryable
  });
}

export async function configureHomeAssistant(url: string, token: string): Promise<void> {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    throwHa({
      code: "INVALID_URL",
      message: "Home Assistant URL is required.",
      retryable: false
    });
  }
  try {
    assertHomeAssistantBaseUrl(new URL(normalizedUrl));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid Home Assistant URL.";
    throwHa({
      code: "URL_POLICY",
      message,
      retryable: false
    });
  }
  const trimmedToken = typeof token === "string" ? token.trim() : "";
  if (trimmedToken) {
    await saveHaToken(trimmedToken);
  } else {
    const existingToken = await getHaToken();
    if (!existingToken) {
      throwHa({
        code: "TOKEN_REQUIRED",
        message: "Home Assistant token is required for initial setup.",
        retryable: false
      });
    }
  }
  setSetting(HA_BASE_URL_KEY, normalizedUrl);
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
  if (!token || !url) {
    throwHa({
      code: "NOT_CONFIGURED",
      message: "Home Assistant is not configured yet. Add a URL and token in Household settings.",
      retryable: false
    });
  }

  // Check if Home Assistant host is allowed
  try {
    const hostname = new URL(url).hostname;
    checkHostAllowed(hostname);
  } catch (error) {
    if (error instanceof Error && error.name === "HostNotAllowedError") {
      throwHa({
        code: "HOST_BLOCKED",
        message: error.message,
        retryable: false
      });
    }
    throwHa({
      code: "INVALID_URL",
      message: "Invalid Home Assistant URL format.",
      retryable: false
    });
  }

  if (!path.startsWith("/")) {
    throwHa({
      code: "INVALID_REQUEST",
      message: "Home Assistant request path must start with '/'.",
      retryable: false
    });
  }
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
      const res = testFetchOverride
        ? await testFetchOverride(path, { ...init, method, headers, signal: controller.signal })
        : await fetch(`${url}${path}`, {
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
        throwHa({
          code: "REQUEST_TIMEOUT",
          message: `Home Assistant request timed out after ${HA_REQUEST_TIMEOUT_MS}ms.`,
          retryable: true
        });
      }
      throwHa({
        code: "REQUEST_FAILED",
        message: `Home Assistant request failed: ${toErrorMessage(error)}`,
        retryable: true
      });
    } finally {
      clearTimeout(timeoutRef);
    }
  }
  throwHa({
    code: "REQUEST_FAILED",
    message: `Home Assistant request failed: ${toErrorMessage(lastError)}`,
    retryable: true
  });
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
    throw await throwFromHttpResponse(configResponse, "connection failed", "Check URL/token.");
  }
  throw await throwFromHttpResponse(apiRootResponse, "connection failed", "Check URL/token.");
}

export async function refreshEntities(): Promise<void> {
  const statesResponse = await authedFetch("/api/states");
  if (!statesResponse.ok) {
    throw await throwFromHttpResponse(statesResponse, "states fetch failed", "Unable to read entity states.");
  }
  let statesJson: unknown;
  try {
    statesJson = await statesResponse.json();
  } catch {
    throwHa({
      code: "STATES_INVALID_JSON",
      message: "Home Assistant states response was not valid JSON.",
      retryable: true
    });
  }
  const states = parseHaStatesResponse(statesJson);
  const syncMark = new Date().toISOString();
  const insert = getDb().prepare(
    "INSERT INTO devices_cache (id, entityId, friendlyName, domain, state, attributes, lastSeenAt) VALUES (@id, @entityId, @friendlyName, @domain, @state, @attributes, @lastSeenAt) ON CONFLICT(entityId) DO UPDATE SET friendlyName=excluded.friendlyName, domain=excluded.domain, state=excluded.state, attributes=excluded.attributes, lastSeenAt=excluded.lastSeenAt"
  );
  const txn = getDb().transaction((rows: HaStateRow[]) => {
    for (const row of rows) {
      const domain = row.entity_id.split(".")[0] || "unknown";
      const attrs = row.attributes;
      const friendly =
        attrs && typeof attrs.friendly_name === "string" && attrs.friendly_name.trim()
          ? attrs.friendly_name
          : row.entity_id;
      insert.run({
        id: randomUUID(),
        entityId: row.entity_id,
        friendlyName: friendly,
        domain,
        state: row.state,
        attributes: JSON.stringify(attrs ?? {}),
        lastSeenAt: syncMark
      });
    }
  });
  txn(states);
  const pruned = getDb().prepare("DELETE FROM devices_cache WHERE lastSeenAt < @sync").run({ sync: syncMark }).changes;
  if (pruned > 0) {
    mainLog.info(`Pruned ${pruned} stale device cache row(s) not seen in this Home Assistant sync.`);
  }
}

/**
 * Domains that expose a `domain.toggle` service in Home Assistant.
 * Prefer toggle so repeated rule runs flip state instead of forcing turn_on only.
 */
const TOGGLE_SERVICE_DOMAINS = new Set([
  "alarm_control_panel",
  "automation",
  "cover",
  "fan",
  "group",
  "humidifier",
  "input_boolean",
  "input_button",
  "light",
  "lock",
  "media_player",
  "remote",
  "script",
  "siren",
  "switch",
  "valve",
  "vacuum",
  "water_heater"
]);

export async function toggleEntity(entityId: string): Promise<void> {
  const domain = entityId.split(".")[0] || "";
  const service = TOGGLE_SERVICE_DOMAINS.has(domain) ? "toggle" : "turn_on";
  const response = await authedFetch(`/api/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify({ entity_id: entityId })
  });
  if (!response.ok) {
    throw await throwFromHttpResponse(response, "toggle failed", "Unable to toggle entity.");
  }
}

function getConfiguredBaseUrl(): string {
  return normalizeUrl(getSetting(HA_BASE_URL_KEY) || "");
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.toString().replace(/\/$/, "");
    } catch {
      return "";
    }
  }
  mainLog.warn(
    `Home Assistant URL has no scheme; defaulting to https:// (host preview: ${trimmed.slice(0, 96)}). Prefer an explicit https:// URL for remote instances.`
  );
  const withHttps = `https://${trimmed}`;
  try {
    const parsed = new URL(withHttps);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
