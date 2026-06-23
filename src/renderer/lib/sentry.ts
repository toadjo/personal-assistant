/**
 * Renderer-side Sentry wrapper.
 *
 * Centralizes crash-reporting initialization and breadcrumb capture so that
 * the rest of the renderer can call `addBreadcrumb` / `captureException`
 * without worrying about whether Sentry is available or allowed by policy.
 *
 * Initialization is gated by the security policy's `allowCrashReporting`
 * flag — when false (e.g. corporate mode), Sentry is never initialized and
 * all capture calls become no-ops, ensuring no telemetry leaves the device.
 */

import { getAssistantApi } from "./assistantApi";

let sentryModule: typeof import("@sentry/electron/renderer") | null = null;
let initialized = false;

/**
 * Initialize Sentry renderer SDK if a DSN is configured AND the security
 * policy allows crash reporting. Safe to call once at app startup; subsequent
 * calls are no-ops.
 */
export async function initSentryIfAllowed(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  // Gate behind security policy. If the preload bridge is unavailable (e.g.
  // in browser-based E2E), default to NOT initializing to avoid leaking
  // telemetry in restricted environments.
  const api = getAssistantApi();
  if (!api?.getSecurityPolicy) return;
  let policy;
  try {
    policy = await api.getSecurityPolicy();
  } catch {
    return;
  }
  if (!policy?.allowCrashReporting) return;

  sentryModule = await import("@sentry/electron/renderer");
  sentryModule.init({
    dsn,
    environment: import.meta.env.MODE,
    beforeBreadcrumb: (breadcrumb) => {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === "ui" && breadcrumb.message?.includes("mouse")) {
        return null;
      }
      return breadcrumb;
    }
  });
}

/**
 * Add a breadcrumb to the current Sentry scope.
 *
 * No-op when Sentry is not initialized (no DSN, policy disallows, or preload
 * unavailable). This makes it safe to sprinkle breadcrumb calls throughout
 * the renderer without runtime checks.
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: "info" | "warning" | "error";
  type?: string;
  data?: Record<string, unknown>;
}): void {
  if (!sentryModule) return;
  sentryModule.addBreadcrumb(breadcrumb);
}

/**
 * Capture an exception in the current Sentry scope.
 *
 * No-op when Sentry is not initialized. Falls back to console.error so the
 * error is still visible during development.
 */
export function captureException(error: unknown): void {
  if (sentryModule) {
    sentryModule.captureException(error);
  } else {
    console.error("[sentry:disabled]", error);
  }
}

/**
 * Test-only: reset the module state so initialization can be re-driven.
 */
export function __resetSentryForTests(): void {
  sentryModule = null;
  initialized = false;
}
