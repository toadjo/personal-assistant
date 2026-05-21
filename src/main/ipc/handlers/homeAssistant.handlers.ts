import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { getDb } from "../../db";
import {
  configureHomeAssistant,
  getHomeAssistantConfig,
  refreshEntities,
  setTestFetchOverride,
  testConnection,
  toggleEntity
} from "../../services/homeAssistant";
import { registerInvoke } from "../invoke-handle";
import { haConfigSchema, haEntityIdSchema } from "../schemas";
import { isHomeAssistantAllowed } from "../../security/policy";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for Home Assistant configuration, health checks, entity cache, and toggles. */
export function registerHomeAssistantHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.haConfigure, assertSender, (_event, payload) => {
    if (!isHomeAssistantAllowed()) {
      throw new Error("Home Assistant integration is disabled by corporate policy.");
    }
    const parsed = haConfigSchema.parse(payload);
    return configureHomeAssistant(parsed.url, parsed.token);
  });
  registerInvoke(IpcInvoke.haGetConfig, assertSender, () => {
    return getHomeAssistantConfig();
  });
  registerInvoke(IpcInvoke.haTest, assertSender, () => {
    if (!isHomeAssistantAllowed()) {
      throw new Error("Home Assistant integration is disabled by corporate policy.");
    }
    return testConnection();
  });
  registerInvoke(IpcInvoke.haRefresh, assertSender, () => {
    if (!isHomeAssistantAllowed()) {
      throw new Error("Home Assistant integration is disabled by corporate policy.");
    }
    return refreshEntities();
  });
  registerInvoke(IpcInvoke.haToggle, assertSender, (_event, entityId) => {
    if (!isHomeAssistantAllowed()) {
      throw new Error("Home Assistant integration is disabled by corporate policy.");
    }
    return toggleEntity(haEntityIdSchema.parse(entityId));
  });
  registerInvoke(IpcInvoke.haListDevices, assertSender, () => {
    if (!isHomeAssistantAllowed()) {
      throw new Error("Home Assistant integration is disabled by corporate policy.");
    }
    return getDb().prepare("SELECT * FROM devices_cache ORDER BY friendlyName ASC").all();
  });
  /**
   * Test-only handler: allows Electron E2E tests to inject a fake fetch implementation
   * to simulate Home Assistant failures without requiring a live server.
   * Only active when ELECTRON_E2E_TEST_MODE is set.
   */
  registerInvoke(IpcInvoke.testSetHaFetchOverride, assertSender, (_event, overrideConfig) => {
    if (process.env.ELECTRON_E2E_TEST_MODE !== "1") {
      throw new Error("Test-only handler: not allowed in production");
    }
    if (overrideConfig === null) {
      setTestFetchOverride(null);
      return;
    }
    // Simulate various failure modes based on config
    const config = overrideConfig as { mode: "timeout" | "network_error" | "http_error"; status?: number };
    if (config.mode === "timeout") {
      setTestFetchOverride(async () => {
        const error = new Error("The operation was aborted.");
        error.name = "AbortError";
        throw error;
      });
    } else if (config.mode === "network_error") {
      setTestFetchOverride(async () => {
        throw new Error("ECONNREFUSED");
      });
    } else if (config.mode === "http_error") {
      setTestFetchOverride(async () => {
        return new Response(JSON.stringify({ error: "Simulated error" }), {
          status: config.status || 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "application/json" }
        });
      });
    } else {
      throw new Error(`Unknown test override mode: ${config.mode}`);
    }
  });
}
