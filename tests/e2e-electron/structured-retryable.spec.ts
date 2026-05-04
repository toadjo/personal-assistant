/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "./electron-harness.js";

test.describe("Structured Retryable Failures", () => {
  test("Home Assistant timeout includes retryable structured metadata", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.configureHomeAssistant({
        url: "http://localhost:8123",
        token: "test-token"
      });
      await api.setTestHaFetchOverride({ mode: "timeout" });
    });

    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.testHomeAssistant();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      } finally {
        await api.setTestHaFetchOverride(null);
      }
    });

    expect(error).toBeTruthy();
    expect(error).toContain("timed out");
    expect(error).toContain('"code":"REQUEST_TIMEOUT"');
    expect(error).toContain('"retryable":true');
  });

  test("Home Assistant network error includes retryable structured metadata", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.configureHomeAssistant({
        url: "http://localhost:8123",
        token: "test-token"
      });
      await api.setTestHaFetchOverride({ mode: "network_error" });
    });

    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.testHomeAssistant();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      } finally {
        await api.setTestHaFetchOverride(null);
      }
    });

    expect(error).toBeTruthy();
    expect(error).toContain("failed");
    expect(error).toContain('"code":"REQUEST_FAILED"');
    expect(error).toContain('"retryable":true');
  });

  test("non-retryable structured errors include non-retryable metadata", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.configureHomeAssistant({
        url: "http://localhost:8123",
        token: "test-token"
      });
      await api.setTestHaFetchOverride({ mode: "http_error", status: 401 });
    });

    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.testHomeAssistant();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      } finally {
        await api.setTestHaFetchOverride(null);
      }
    });

    expect(error).toBeTruthy();
    expect(error).toContain("401");
    expect(error).toContain('"code":"HTTP_401"');
    expect(error).toContain('"retryable":false');
  });

  test("real preload bridge is present and used", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Verify that window.assistantApi exists and is the real preload bridge
    const hasAssistantApi = await window.evaluate(() => {
      return typeof (window as any).assistantApi === "object";
    });

    expect(hasAssistantApi).toBe(true);

    // Verify it's not the browser stub by checking a specific method signature
    const hasRealMethods = await window.evaluate(() => {
      const api = (window as any).assistantApi;
      return (
        typeof api.listNotes === "function" &&
        typeof api.createNote === "function" &&
            typeof api.createReminder === "function" &&
            typeof api.setTestHaFetchOverride === "function"
      );
    });

    expect(hasRealMethods).toBe(true);
  });
});
