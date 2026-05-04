/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "./electron-harness";

test.describe("Structured Retryable Failures", () => {
  test("Home Assistant timeout shows retry hint", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Configure HA with valid credentials first
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.configureHomeAssistant({
        url: "http://localhost:8123",
        token: "test-token"
      });
    });

    // Set test override to simulate timeout
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.setTestHaFetchOverride({ mode: "timeout" });
    });

    // Try to test connection (should timeout and show retry hint)
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.testHomeAssistant();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    expect(error).toContain("timed out");
    // Retryable errors should have retry hint
    expect(error).toContain("You can try again in a moment");

    // Clean up test override
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.setTestHaFetchOverride(null);
    });
  });

  test("Home Assistant network error shows retry hint", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Configure HA with valid credentials first
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.configureHomeAssistant({
        url: "http://localhost:8123",
        token: "test-token"
      });
    });

    // Set test override to simulate network error
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.setTestHaFetchOverride({ mode: "network_error" });
    });

    // Try to test connection (should fail with network error and show retry hint)
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.testHomeAssistant();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    expect(error).toContain("failed");
    // Retryable errors should have retry hint
    expect(error).toContain("You can try again in a moment");

    // Clean up test override
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.setTestHaFetchOverride(null);
    });
  });

  test("non-retryable structured errors do not show retry hint", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Configure HA with valid credentials first
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.configureHomeAssistant({
        url: "http://localhost:8123",
        token: "test-token"
      });
    });

    // Set test override to simulate HTTP 401 (auth error - non-retryable)
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.setTestHaFetchOverride({ mode: "http_error", status: 401 });
    });

    // Try to test connection (should fail with auth error)
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.testHomeAssistant();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    expect(error).toContain("401");
    // Non-retryable errors should NOT have retry hint
    expect(error).not.toContain("You can try again in a moment");

    // Clean up test override
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.setTestHaFetchOverride(null);
    });
  });

  test("real preload bridge is present and used", async ({ window }) => {
    await window.waitForLoadState("networkidle");

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
        typeof api.setTestHaFetchOverride === "function"
      );
    });

    expect(hasRealMethods).toBe(true);
  });
});
