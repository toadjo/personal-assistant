import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track the mocked Sentry renderer module so we can assert on init/addBreadcrumb calls.
const mockInit = vi.fn();
const mockAddBreadcrumb = vi.fn();
const mockCaptureException = vi.fn();

vi.mock("@sentry/electron/renderer", () => ({
  init: mockInit,
  addBreadcrumb: mockAddBreadcrumb,
  captureException: mockCaptureException
}));

import {
  initSentryIfAllowed,
  addBreadcrumb,
  captureException,
  __resetSentryForTests
} from "./sentry";

const PERSONAL_POLICY = {
  schemaVersion: 1 as const,
  mode: "personal" as const,
  allowAi: true,
  allowTeamSync: true,
  allowHomeAssistant: true,
  allowConnectedCalendar: true,
  allowGoogleCalendar: true,
  allowMicrosoftCalendar: true,
  allowCrashReporting: true,
  allowBackupExport: true,
  allowBackupImport: true,
  allowExternalUrls: true,
  requireSecureSecretStorage: false,
  allowedHosts: []
};

const CORPORATE_POLICY = { ...PERSONAL_POLICY, mode: "corporate" as const, allowCrashReporting: false };

function setWindowAssistantApi(api: unknown): void {
  (window as unknown as { assistantApi?: unknown }).assistantApi = api;
}

function clearWindowAssistantApi(): void {
  delete (window as unknown as { assistantApi?: unknown }).assistantApi;
}

const originalEnv = { ...import.meta.env };

beforeEach(() => {
  __resetSentryForTests();
  mockInit.mockClear();
  mockAddBreadcrumb.mockClear();
  mockCaptureException.mockClear();
  clearWindowAssistantApi();
  // Restore env so tests can mutate independently
  for (const key of Object.keys(import.meta.env)) {
    delete (import.meta.env as Record<string, unknown>)[key];
  }
  Object.assign(import.meta.env, originalEnv);
});

afterEach(() => {
  __resetSentryForTests();
  clearWindowAssistantApi();
});

describe("initSentryIfAllowed", () => {
  it("does nothing when VITE_SENTRY_DSN is not set", async () => {
    delete (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN;
    setWindowAssistantApi({ getSecurityPolicy: vi.fn() });
    await initSentryIfAllowed();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("does not init when preload bridge is unavailable", async () => {
    (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = "https://example@sentry.io/1";
    clearWindowAssistantApi();
    await initSentryIfAllowed();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("does not init when policy disallows crash reporting (corporate mode)", async () => {
    (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = "https://example@sentry.io/1";
    const getSecurityPolicy = vi.fn().mockResolvedValue(CORPORATE_POLICY);
    setWindowAssistantApi({ getSecurityPolicy });
    await initSentryIfAllowed();
    expect(getSecurityPolicy).toHaveBeenCalled();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("inits Sentry when DSN is set and policy allows crash reporting", async () => {
    (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = "https://example@sentry.io/1";
    const getSecurityPolicy = vi.fn().mockResolvedValue(PERSONAL_POLICY);
    setWindowAssistantApi({ getSecurityPolicy });
    await initSentryIfAllowed();
    expect(getSecurityPolicy).toHaveBeenCalled();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: "https://example@sentry.io/1" })
    );
  });

  it("does not init when getSecurityPolicy throws", async () => {
    (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = "https://example@sentry.io/1";
    const getSecurityPolicy = vi.fn().mockRejectedValue(new Error("IPC failed"));
    setWindowAssistantApi({ getSecurityPolicy });
    await initSentryIfAllowed();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("is idempotent — second call does not re-init", async () => {
    (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = "https://example@sentry.io/1";
    const getSecurityPolicy = vi.fn().mockResolvedValue(PERSONAL_POLICY);
    setWindowAssistantApi({ getSecurityPolicy });
    await initSentryIfAllowed();
    await initSentryIfAllowed();
    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});

describe("addBreadcrumb", () => {
  it("is a no-op before init", () => {
    addBreadcrumb({ category: "navigation", message: "module:home" });
    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });

  it("forwards to Sentry after init", async () => {
    (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = "https://example@sentry.io/1";
    setWindowAssistantApi({ getSecurityPolicy: vi.fn().mockResolvedValue(PERSONAL_POLICY) });
    await initSentryIfAllowed();
    addBreadcrumb({ category: "command", message: "new note", level: "info" });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: "command",
      message: "new note",
      level: "info"
    });
  });
});

describe("captureException", () => {
  it("is a no-op (no throw) before init", () => {
    expect(() => captureException(new Error("boom"))).not.toThrow();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("forwards to Sentry after init", async () => {
    (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = "https://example@sentry.io/1";
    setWindowAssistantApi({ getSecurityPolicy: vi.fn().mockResolvedValue(PERSONAL_POLICY) });
    await initSentryIfAllowed();
    const err = new Error("boom");
    captureException(err);
    expect(mockCaptureException).toHaveBeenCalledWith(err);
  });
});
